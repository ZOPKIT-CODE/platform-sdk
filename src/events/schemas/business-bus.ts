import { z } from 'zod';

// ---------------------------------------------------------------------------
// Business Event Bus schemas — events published by CRM, HRMS, PM, and FA.
// All event types are prefixed with the source app e.g. 'crm.invoice.created'.
// ---------------------------------------------------------------------------

// --- CRM events ------------------------------------------------------------

export const CrmInvoiceCreatedPayload = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
      taxRate: z.number().optional(),
    }),
  ),
  subtotal: z.number(),
  taxAmount: z.number().default(0),
  totalAmount: z.number(),
  currency: z.string().default('USD'),
  dueDate: z.string().datetime(),
  issueDate: z.string().datetime(),
  notes: z.string().optional(),
  dealId: z.string().optional(),
  projectId: z.string().optional(),
});

export const CrmInvoiceUpdatedPayload = CrmInvoiceCreatedPayload.partial().extend({
  invoiceId: z.string(),
});

export const CrmInvoiceVoidedPayload = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  voidedAt: z.string().datetime(),
  voidedBy: z.string().optional(),
  reason: z.string().optional(),
  originalAmount: z.number(),
});

export const CrmPaymentReceivedPayload = z.object({
  paymentId: z.string(),
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  customerId: z.string(),
  amount: z.number(),
  currency: z.string().default('USD'),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().datetime(),
  reference: z.string().optional(),
  isPartialPayment: z.boolean().default(false),
  outstandingBalance: z.number().default(0),
});

export const CrmDealClosedPayload = z.object({
  dealId: z.string(),
  dealName: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  amount: z.number(),
  currency: z.string().default('USD'),
  closedAt: z.string().datetime(),
  projectId: z.string().optional(),
  revenueRecognitionMethod: z
    .enum(['completed_contract', 'percentage_completion', 'time_and_material', 'fixed_price'])
    .optional(),
});

export const CrmCustomerCreatedPayload = z.object({
  customerId: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.record(z.string()).optional(),
  creditLimit: z.number().optional(),
  currency: z.string().default('USD'),
});

export const CrmCustomerUpdatedPayload = CrmCustomerCreatedPayload.partial().extend({
  customerId: z.string(),
});

// --- HRMS events -----------------------------------------------------------

export const HrmsPayrollProcessedPayload = z.object({
  payrollRunId: z.string(),
  payrollPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  processedAt: z.string().datetime(),
  totalGrossPay: z.number(),
  totalNetPay: z.number(),
  totalTaxWithheld: z.number(),
  totalDeductions: z.number(),
  currency: z.string().default('USD'),
  costCenterId: z.string().optional(),
  employeeCount: z.number().int(),
  journalEntryInstructions: z.array(
    z.object({
      accountCode: z.string(),
      description: z.string(),
      debit: z.number().optional(),
      credit: z.number().optional(),
      costCenterId: z.string().optional(),
    }),
  ),
});

export const HrmsExpenseApprovedPayload = z.object({
  expenseId: z.string(),
  employeeId: z.string(),
  employeeName: z.string().optional(),
  amount: z.number(),
  currency: z.string().default('USD'),
  category: z.string(),
  description: z.string().optional(),
  receiptDate: z.string().datetime(),
  approvedAt: z.string().datetime(),
  approvedBy: z.string(),
  projectId: z.string().optional(),
  costCenterId: z.string().optional(),
  reimbursable: z.boolean().default(true),
});

export const HrmsEmployeeHiredPayload = z.object({
  employeeId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  startDate: z.string().datetime(),
  salary: z.number().optional(),
  currency: z.string().default('USD'),
  costCenterId: z.string().optional(),
  managerId: z.string().optional(),
});

export const HrmsEmployeeTerminatedPayload = z.object({
  employeeId: z.string(),
  terminationDate: z.string().datetime(),
  terminationType: z.enum(['voluntary', 'involuntary', 'retirement']),
  finalSettlementAmount: z.number().optional(),
  currency: z.string().default('USD'),
  noticePeriodEndDate: z.string().datetime().optional(),
});

export const HrmsSalaryRevisedPayload = z.object({
  employeeId: z.string(),
  previousSalary: z.number(),
  newSalary: z.number(),
  currency: z.string().default('USD'),
  effectiveDate: z.string().datetime(),
  costCenterId: z.string().optional(),
});

export const HrmsLeaveApprovedPayload = z.object({
  leaveId: z.string(),
  employeeId: z.string(),
  leaveType: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  daysCount: z.number(),
  approvedBy: z.string(),
});

// --- PM events -------------------------------------------------------------

export const PmProjectCreatedPayload = z.object({
  projectId: z.string(),
  projectName: z.string(),
  customerId: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().default('USD'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  billingType: z
    .enum(['fixed_price', 'time_and_material', 'retainer', 'milestone'])
    .optional(),
  managerId: z.string().optional(),
});

export const PmProjectCompletedPayload = z.object({
  projectId: z.string(),
  projectName: z.string(),
  customerId: z.string().optional(),
  completedAt: z.string().datetime(),
  totalBillableAmount: z.number().optional(),
  currency: z.string().default('USD'),
  finalBillingRequired: z.boolean().default(false),
});

export const PmTimesheetApprovedPayload = z.object({
  timesheetId: z.string(),
  employeeId: z.string(),
  projectId: z.string(),
  weekStartDate: z.string().datetime(),
  weekEndDate: z.string().datetime(),
  totalHours: z.number(),
  billableHours: z.number(),
  hourlyRate: z.number().optional(),
  billableAmount: z.number().optional(),
  currency: z.string().default('USD'),
  approvedBy: z.string(),
  approvedAt: z.string().datetime(),
  costCenterId: z.string().optional(),
});

export const PmMilestoneCompletedPayload = z.object({
  milestoneId: z.string(),
  milestoneName: z.string(),
  projectId: z.string(),
  customerId: z.string().optional(),
  completedAt: z.string().datetime(),
  billingAmount: z.number().optional(),
  currency: z.string().default('USD'),
  percentageComplete: z.number().min(0).max(100).optional(),
  invoiceId: z.string().optional(),
});

export const PmProjectBilledPayload = z.object({
  projectId: z.string(),
  projectName: z.string(),
  customerId: z.string(),
  billingAmount: z.number(),
  currency: z.string().default('USD'),
  billingPeriodStart: z.string().datetime().optional(),
  billingPeriodEnd: z.string().datetime().optional(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    }),
  ),
  milestoneId: z.string().optional(),
  notes: z.string().optional(),
});

export const PmResourceAllocatedPayload = z.object({
  allocationId: z.string(),
  employeeId: z.string(),
  projectId: z.string(),
  role: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  allocatedHoursPerWeek: z.number().optional(),
});

// --- FA outbound events (narrow — see ADR-006) -----------------------------

export const FaInvoiceStatusPayload = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  status: z.enum(['paid', 'partially_paid', 'overdue', 'written_off']),
  paidAmount: z.number().optional(),
  outstandingAmount: z.number().optional(),
  statusDate: z.string().datetime(),
});

export const FaExpenseReimbursedPayload = z.object({
  expenseId: z.string(),
  employeeId: z.string(),
  reimbursedAmount: z.number(),
  currency: z.string().default('USD'),
  reimbursedAt: z.string().datetime(),
  paymentReference: z.string().optional(),
});

// --- Registry: event type → payload schema --------------------------------

export const BUSINESS_BUS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'crm.invoice.created': CrmInvoiceCreatedPayload,
  'crm.invoice.updated': CrmInvoiceUpdatedPayload,
  'crm.invoice.voided': CrmInvoiceVoidedPayload,
  'crm.payment.received': CrmPaymentReceivedPayload,
  'crm.deal.closed': CrmDealClosedPayload,
  'crm.customer.created': CrmCustomerCreatedPayload,
  'crm.customer.updated': CrmCustomerUpdatedPayload,
  'hrms.payroll.processed': HrmsPayrollProcessedPayload,
  'hrms.expense.approved': HrmsExpenseApprovedPayload,
  'hrms.employee.hired': HrmsEmployeeHiredPayload,
  'hrms.employee.terminated': HrmsEmployeeTerminatedPayload,
  'hrms.salary.revised': HrmsSalaryRevisedPayload,
  'hrms.leave.approved': HrmsLeaveApprovedPayload,
  'pm.project.created': PmProjectCreatedPayload,
  'pm.project.completed': PmProjectCompletedPayload,
  'pm.timesheet.approved': PmTimesheetApprovedPayload,
  'pm.milestone.completed': PmMilestoneCompletedPayload,
  'pm.project.billed': PmProjectBilledPayload,
  'pm.resource.allocated': PmResourceAllocatedPayload,
  'fa.accounting.invoice.status': FaInvoiceStatusPayload,
  'fa.expense.reimbursed': FaExpenseReimbursedPayload,
};

export type CrmInvoiceCreatedPayload = z.infer<typeof CrmInvoiceCreatedPayload>;
export type CrmPaymentReceivedPayload = z.infer<typeof CrmPaymentReceivedPayload>;
export type CrmDealClosedPayload = z.infer<typeof CrmDealClosedPayload>;
export type HrmsPayrollProcessedPayload = z.infer<typeof HrmsPayrollProcessedPayload>;
export type HrmsExpenseApprovedPayload = z.infer<typeof HrmsExpenseApprovedPayload>;
export type HrmsEmployeeHiredPayload = z.infer<typeof HrmsEmployeeHiredPayload>;
export type PmProjectBilledPayload = z.infer<typeof PmProjectBilledPayload>;
export type PmTimesheetApprovedPayload = z.infer<typeof PmTimesheetApprovedPayload>;
export type FaInvoiceStatusPayload = z.infer<typeof FaInvoiceStatusPayload>;
