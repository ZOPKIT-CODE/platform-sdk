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
export declare function invoiceCollectionWorkflow(input: InvoiceCollectionInput): Promise<void>;
//# sourceMappingURL=invoice-collection.d.ts.map