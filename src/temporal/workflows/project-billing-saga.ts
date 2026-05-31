import { proxyActivities, ApplicationFailure } from '@temporalio/workflow';
import { ACTIVITY_OPTIONS } from '../retry-policies';

/**
 * Project Billing Saga (ADR-014).
 *
 * Triggered when PM publishes pm.project.billed or pm.project.completed.
 * Orchestrates the full billing cycle across CRM and FA with explicit compensation.
 *
 * Forward path:
 *   1. Validate credit limit (synchronous FA check — ADR-017)
 *   2. CRM creates invoice
 *   3. FA recognizes revenue
 *   4. PM marks billing cycle closed
 *
 * Compensation (on failure at step N):
 *   Step 3 fails → CRM voids the invoice
 *   Step 2 fails → nothing created, no compensation needed
 */

export interface ProjectBillingSagaInput {
  tenantId: string;
  correlationId: string;
  projectId: string;
  projectName: string;
  customerId: string;
  billingAmount: number;
  currency: string;
  revenueRecognitionMethod?: 'completed_contract' | 'percentage_completion' | 'time_and_material' | 'fixed_price';
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  notes?: string;
  milestoneId?: string;
}

interface ProjectBillingActivities {
  checkCreditLimit(input: { tenantId: string; customerId: string; amount: number; currency: string }): Promise<boolean>;
  createInvoice(input: ProjectBillingSagaInput & { correlationId: string }): Promise<string>;
  voidInvoice(input: { tenantId: string; invoiceId: string; reason: string }): Promise<void>;
  recognizeRevenue(input: { tenantId: string; invoiceId: string; correlationId: string; method?: string; amount: number; currency: string }): Promise<void>;
  reverseRevenueEntry(input: { tenantId: string; invoiceId: string; reason: string }): Promise<void>;
  closeBillingCycle(input: { tenantId: string; projectId: string; invoiceId: string; milestoneId?: string }): Promise<void>;
}

const crm = proxyActivities<Pick<ProjectBillingActivities, 'createInvoice' | 'voidInvoice'>>(
  ACTIVITY_OPTIONS.crmMutation,
);
const fa = proxyActivities<Pick<ProjectBillingActivities, 'checkCreditLimit' | 'recognizeRevenue' | 'reverseRevenueEntry'>>(
  ACTIVITY_OPTIONS.faJournal,
);
const pm = proxyActivities<Pick<ProjectBillingActivities, 'closeBillingCycle'>>(
  ACTIVITY_OPTIONS.pm,
);

export async function projectBillingSaga(input: ProjectBillingSagaInput): Promise<void> {
  // Step 1: Credit limit check (synchronous gate — ADR-017)
  const creditOk = await fa.checkCreditLimit({
    tenantId: input.tenantId,
    customerId: input.customerId,
    amount: input.billingAmount,
    currency: input.currency,
  });

  if (!creditOk) {
    throw ApplicationFailure.create({
      message: `Credit limit exceeded for customer ${input.customerId}`,
      nonRetryable: true,
      type: 'CreditLimitExceededError',
    });
  }

  // Step 2: Create invoice in CRM
  let invoiceId: string;
  try {
    invoiceId = await crm.createInvoice(input);
  } catch (err) {
    // Nothing was created — rethrow with no compensation needed
    throw ApplicationFailure.fromError(err as Error);
  }

  // Step 3: Recognize revenue in FA — compensate by voiding invoice on failure
  try {
    await fa.recognizeRevenue({
      tenantId: input.tenantId,
      invoiceId,
      correlationId: input.correlationId,
      method: input.revenueRecognitionMethod,
      amount: input.billingAmount,
      currency: input.currency,
    });
  } catch (err) {
    await crm.voidInvoice({
      tenantId: input.tenantId,
      invoiceId,
      reason: 'Revenue recognition failed — saga compensation',
    });
    throw ApplicationFailure.fromError(err as Error);
  }

  // Step 4: Close billing cycle in PM
  await pm.closeBillingCycle({
    tenantId: input.tenantId,
    projectId: input.projectId,
    invoiceId,
    milestoneId: input.milestoneId,
  });
}
