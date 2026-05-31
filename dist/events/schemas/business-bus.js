"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_BUS_SCHEMAS = exports.FaExpenseReimbursedPayload = exports.FaInvoiceStatusPayload = exports.PmResourceAllocatedPayload = exports.PmProjectBilledPayload = exports.PmMilestoneCompletedPayload = exports.PmTimesheetApprovedPayload = exports.PmProjectCompletedPayload = exports.PmProjectCreatedPayload = exports.HrmsLeaveApprovedPayload = exports.HrmsSalaryRevisedPayload = exports.HrmsEmployeeTerminatedPayload = exports.HrmsEmployeeHiredPayload = exports.HrmsExpenseApprovedPayload = exports.HrmsPayrollProcessedPayload = exports.CrmCustomerUpdatedPayload = exports.CrmCustomerCreatedPayload = exports.CrmDealClosedPayload = exports.CrmPaymentReceivedPayload = exports.CrmInvoiceVoidedPayload = exports.CrmInvoiceUpdatedPayload = exports.CrmInvoiceCreatedPayload = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Business Event Bus schemas — events published by CRM, HRMS, PM, and FA.
// All event types are prefixed with the source app e.g. 'crm.invoice.created'.
// ---------------------------------------------------------------------------
// --- CRM events ------------------------------------------------------------
exports.CrmInvoiceCreatedPayload = zod_1.z.object({
    invoiceId: zod_1.z.string(),
    invoiceNumber: zod_1.z.string(),
    customerId: zod_1.z.string(),
    customerName: zod_1.z.string().optional(),
    lineItems: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        quantity: zod_1.z.number(),
        unitPrice: zod_1.z.number(),
        total: zod_1.z.number(),
        taxRate: zod_1.z.number().optional(),
    })),
    subtotal: zod_1.z.number(),
    taxAmount: zod_1.z.number().default(0),
    totalAmount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    dueDate: zod_1.z.string().datetime(),
    issueDate: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional(),
    dealId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
});
exports.CrmInvoiceUpdatedPayload = exports.CrmInvoiceCreatedPayload.partial().extend({
    invoiceId: zod_1.z.string(),
});
exports.CrmInvoiceVoidedPayload = zod_1.z.object({
    invoiceId: zod_1.z.string(),
    invoiceNumber: zod_1.z.string(),
    voidedAt: zod_1.z.string().datetime(),
    voidedBy: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    originalAmount: zod_1.z.number(),
});
exports.CrmPaymentReceivedPayload = zod_1.z.object({
    paymentId: zod_1.z.string(),
    invoiceId: zod_1.z.string(),
    invoiceNumber: zod_1.z.string(),
    customerId: zod_1.z.string(),
    amount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    paymentMethod: zod_1.z.string().optional(),
    paymentDate: zod_1.z.string().datetime(),
    reference: zod_1.z.string().optional(),
    isPartialPayment: zod_1.z.boolean().default(false),
    outstandingBalance: zod_1.z.number().default(0),
});
exports.CrmDealClosedPayload = zod_1.z.object({
    dealId: zod_1.z.string(),
    dealName: zod_1.z.string(),
    customerId: zod_1.z.string(),
    customerName: zod_1.z.string().optional(),
    amount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    closedAt: zod_1.z.string().datetime(),
    projectId: zod_1.z.string().optional(),
    revenueRecognitionMethod: zod_1.z
        .enum(['completed_contract', 'percentage_completion', 'time_and_material', 'fixed_price'])
        .optional(),
});
exports.CrmCustomerCreatedPayload = zod_1.z.object({
    customerId: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.record(zod_1.z.string()).optional(),
    creditLimit: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
});
exports.CrmCustomerUpdatedPayload = exports.CrmCustomerCreatedPayload.partial().extend({
    customerId: zod_1.z.string(),
});
// --- HRMS events -----------------------------------------------------------
exports.HrmsPayrollProcessedPayload = zod_1.z.object({
    payrollRunId: zod_1.z.string(),
    payrollPeriod: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }),
    processedAt: zod_1.z.string().datetime(),
    totalGrossPay: zod_1.z.number(),
    totalNetPay: zod_1.z.number(),
    totalTaxWithheld: zod_1.z.number(),
    totalDeductions: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    costCenterId: zod_1.z.string().optional(),
    employeeCount: zod_1.z.number().int(),
    journalEntryInstructions: zod_1.z.array(zod_1.z.object({
        accountCode: zod_1.z.string(),
        description: zod_1.z.string(),
        debit: zod_1.z.number().optional(),
        credit: zod_1.z.number().optional(),
        costCenterId: zod_1.z.string().optional(),
    })),
});
exports.HrmsExpenseApprovedPayload = zod_1.z.object({
    expenseId: zod_1.z.string(),
    employeeId: zod_1.z.string(),
    employeeName: zod_1.z.string().optional(),
    amount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    category: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    receiptDate: zod_1.z.string().datetime(),
    approvedAt: zod_1.z.string().datetime(),
    approvedBy: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    costCenterId: zod_1.z.string().optional(),
    reimbursable: zod_1.z.boolean().default(true),
});
exports.HrmsEmployeeHiredPayload = zod_1.z.object({
    employeeId: zod_1.z.string(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    email: zod_1.z.string().email(),
    department: zod_1.z.string().optional(),
    jobTitle: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime(),
    salary: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
    costCenterId: zod_1.z.string().optional(),
    managerId: zod_1.z.string().optional(),
});
exports.HrmsEmployeeTerminatedPayload = zod_1.z.object({
    employeeId: zod_1.z.string(),
    terminationDate: zod_1.z.string().datetime(),
    terminationType: zod_1.z.enum(['voluntary', 'involuntary', 'retirement']),
    finalSettlementAmount: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
    noticePeriodEndDate: zod_1.z.string().datetime().optional(),
});
exports.HrmsSalaryRevisedPayload = zod_1.z.object({
    employeeId: zod_1.z.string(),
    previousSalary: zod_1.z.number(),
    newSalary: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    effectiveDate: zod_1.z.string().datetime(),
    costCenterId: zod_1.z.string().optional(),
});
exports.HrmsLeaveApprovedPayload = zod_1.z.object({
    leaveId: zod_1.z.string(),
    employeeId: zod_1.z.string(),
    leaveType: zod_1.z.string(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    daysCount: zod_1.z.number(),
    approvedBy: zod_1.z.string(),
});
// --- PM events -------------------------------------------------------------
exports.PmProjectCreatedPayload = zod_1.z.object({
    projectId: zod_1.z.string(),
    projectName: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    budget: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    billingType: zod_1.z
        .enum(['fixed_price', 'time_and_material', 'retainer', 'milestone'])
        .optional(),
    managerId: zod_1.z.string().optional(),
});
exports.PmProjectCompletedPayload = zod_1.z.object({
    projectId: zod_1.z.string(),
    projectName: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().datetime(),
    totalBillableAmount: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
    finalBillingRequired: zod_1.z.boolean().default(false),
});
exports.PmTimesheetApprovedPayload = zod_1.z.object({
    timesheetId: zod_1.z.string(),
    employeeId: zod_1.z.string(),
    projectId: zod_1.z.string(),
    weekStartDate: zod_1.z.string().datetime(),
    weekEndDate: zod_1.z.string().datetime(),
    totalHours: zod_1.z.number(),
    billableHours: zod_1.z.number(),
    hourlyRate: zod_1.z.number().optional(),
    billableAmount: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
    approvedBy: zod_1.z.string(),
    approvedAt: zod_1.z.string().datetime(),
    costCenterId: zod_1.z.string().optional(),
});
exports.PmMilestoneCompletedPayload = zod_1.z.object({
    milestoneId: zod_1.z.string(),
    milestoneName: zod_1.z.string(),
    projectId: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().datetime(),
    billingAmount: zod_1.z.number().optional(),
    currency: zod_1.z.string().default('USD'),
    percentageComplete: zod_1.z.number().min(0).max(100).optional(),
    invoiceId: zod_1.z.string().optional(),
});
exports.PmProjectBilledPayload = zod_1.z.object({
    projectId: zod_1.z.string(),
    projectName: zod_1.z.string(),
    customerId: zod_1.z.string(),
    billingAmount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    billingPeriodStart: zod_1.z.string().datetime().optional(),
    billingPeriodEnd: zod_1.z.string().datetime().optional(),
    lineItems: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        quantity: zod_1.z.number(),
        unitPrice: zod_1.z.number(),
        total: zod_1.z.number(),
    })),
    milestoneId: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.PmResourceAllocatedPayload = zod_1.z.object({
    allocationId: zod_1.z.string(),
    employeeId: zod_1.z.string(),
    projectId: zod_1.z.string(),
    role: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    allocatedHoursPerWeek: zod_1.z.number().optional(),
});
// --- FA outbound events (narrow — see ADR-006) -----------------------------
exports.FaInvoiceStatusPayload = zod_1.z.object({
    invoiceId: zod_1.z.string(),
    invoiceNumber: zod_1.z.string(),
    status: zod_1.z.enum(['paid', 'partially_paid', 'overdue', 'written_off']),
    paidAmount: zod_1.z.number().optional(),
    outstandingAmount: zod_1.z.number().optional(),
    statusDate: zod_1.z.string().datetime(),
});
exports.FaExpenseReimbursedPayload = zod_1.z.object({
    expenseId: zod_1.z.string(),
    employeeId: zod_1.z.string(),
    reimbursedAmount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    reimbursedAt: zod_1.z.string().datetime(),
    paymentReference: zod_1.z.string().optional(),
});
// --- Registry: event type → payload schema --------------------------------
exports.BUSINESS_BUS_SCHEMAS = {
    'crm.invoice.created': exports.CrmInvoiceCreatedPayload,
    'crm.invoice.updated': exports.CrmInvoiceUpdatedPayload,
    'crm.invoice.voided': exports.CrmInvoiceVoidedPayload,
    'crm.payment.received': exports.CrmPaymentReceivedPayload,
    'crm.deal.closed': exports.CrmDealClosedPayload,
    'crm.customer.created': exports.CrmCustomerCreatedPayload,
    'crm.customer.updated': exports.CrmCustomerUpdatedPayload,
    'hrms.payroll.processed': exports.HrmsPayrollProcessedPayload,
    'hrms.expense.approved': exports.HrmsExpenseApprovedPayload,
    'hrms.employee.hired': exports.HrmsEmployeeHiredPayload,
    'hrms.employee.terminated': exports.HrmsEmployeeTerminatedPayload,
    'hrms.salary.revised': exports.HrmsSalaryRevisedPayload,
    'hrms.leave.approved': exports.HrmsLeaveApprovedPayload,
    'pm.project.created': exports.PmProjectCreatedPayload,
    'pm.project.completed': exports.PmProjectCompletedPayload,
    'pm.timesheet.approved': exports.PmTimesheetApprovedPayload,
    'pm.milestone.completed': exports.PmMilestoneCompletedPayload,
    'pm.project.billed': exports.PmProjectBilledPayload,
    'pm.resource.allocated': exports.PmResourceAllocatedPayload,
    'fa.accounting.invoice.status': exports.FaInvoiceStatusPayload,
    'fa.expense.reimbursed': exports.FaExpenseReimbursedPayload,
};
//# sourceMappingURL=business-bus.js.map