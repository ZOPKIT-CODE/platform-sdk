import { proxyActivities, sleep } from '@temporalio/workflow';
import { ACTIVITY_OPTIONS } from '../retry-policies';

/**
 * Invoice Collection Workflow (ADR-014).
 *
 * Long-running workflow (up to 30 days) triggered when crm.invoice.created arrives.
 * Uses Temporal's durable sleep — survives server restarts, redeployments, crashes.
 *
 * Workflow ID: `invoice-collection-${invoiceId}` (one per invoice — idempotent)
 *
 * Timeline:
 *   Day  0: Invoice created — workflow starts
 *   Day 15: Check payment status → send reminder if unpaid
 *   Day 30: Check payment status → escalate + mark overdue if still unpaid
 */

export interface InvoiceCollectionInput {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  amount: number;
  currency: string;
  dueDate: string;
}

interface InvoiceCollectionActivities {
  getInvoicePaymentStatus(input: { tenantId: string; invoiceId: string }): Promise<'paid' | 'partially_paid' | 'unpaid' | 'voided'>;
  sendPaymentReminder(input: { tenantId: string; invoiceId: string; invoiceNumber: string; customerId: string; attempt: number; amount: number; currency: string }): Promise<void>;
  escalateOverdueInvoice(input: { tenantId: string; invoiceId: string; invoiceNumber: string; customerId: string; amount: number; currency: string }): Promise<void>;
  markInvoiceOverdue(input: { tenantId: string; invoiceId: string }): Promise<void>;
}

const acts = proxyActivities<InvoiceCollectionActivities>({
  ...ACTIVITY_OPTIONS.lookup,
  startToCloseTimeout: '30s',
});
const notify = proxyActivities<Pick<InvoiceCollectionActivities, 'sendPaymentReminder' | 'escalateOverdueInvoice'>>(
  ACTIVITY_OPTIONS.notification,
);
const fa = proxyActivities<Pick<InvoiceCollectionActivities, 'markInvoiceOverdue'>>(
  ACTIVITY_OPTIONS.faJournal,
);

export async function invoiceCollectionWorkflow(input: InvoiceCollectionInput): Promise<void> {
  // Day 15: first reminder
  await sleep('15 days');

  const statusAt15 = await acts.getInvoicePaymentStatus({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
  });

  if (statusAt15 === 'paid' || statusAt15 === 'voided') {
    return; // Done — invoice settled or cancelled
  }

  await notify.sendPaymentReminder({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    invoiceNumber: input.invoiceNumber,
    customerId: input.customerId,
    attempt: 1,
    amount: input.amount,
    currency: input.currency,
  });

  // Day 30: second check — escalate if still unpaid
  await sleep('15 days');

  const statusAt30 = await acts.getInvoicePaymentStatus({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
  });

  if (statusAt30 === 'paid' || statusAt30 === 'voided') {
    return;
  }

  // Overdue — escalate in CRM and mark in FA
  await Promise.all([
    notify.escalateOverdueInvoice({
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      customerId: input.customerId,
      amount: input.amount,
      currency: input.currency,
    }),
    fa.markInvoiceOverdue({
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
    }),
  ]);
}
