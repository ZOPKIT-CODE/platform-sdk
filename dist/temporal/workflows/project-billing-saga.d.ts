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
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    notes?: string;
    milestoneId?: string;
}
export declare function projectBillingSaga(input: ProjectBillingSagaInput): Promise<void>;
//# sourceMappingURL=project-billing-saga.d.ts.map