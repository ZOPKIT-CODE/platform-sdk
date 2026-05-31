import { z } from 'zod';
export declare const CrmInvoiceCreatedPayload: z.ZodObject<{
    invoiceId: z.ZodString;
    invoiceNumber: z.ZodString;
    customerId: z.ZodString;
    customerName: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        total: z.ZodNumber;
        taxRate: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }, {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }>, "many">;
    subtotal: z.ZodNumber;
    taxAmount: z.ZodDefault<z.ZodNumber>;
    totalAmount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    dueDate: z.ZodString;
    issueDate: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    dealId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    dueDate: string;
    issueDate: string;
    customerName?: string | undefined;
    notes?: string | undefined;
    dealId?: string | undefined;
    projectId?: string | undefined;
}, {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }[];
    subtotal: number;
    totalAmount: number;
    dueDate: string;
    issueDate: string;
    customerName?: string | undefined;
    taxAmount?: number | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    dealId?: string | undefined;
    projectId?: string | undefined;
}>;
export declare const CrmInvoiceUpdatedPayload: z.ZodObject<{
    invoiceNumber: z.ZodOptional<z.ZodString>;
    customerId: z.ZodOptional<z.ZodString>;
    customerName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    lineItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        total: z.ZodNumber;
        taxRate: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }, {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }>, "many">>;
    subtotal: z.ZodOptional<z.ZodNumber>;
    taxAmount: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    totalAmount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    dueDate: z.ZodOptional<z.ZodString>;
    issueDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dealId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    projectId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    invoiceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    invoiceId: string;
    invoiceNumber?: string | undefined;
    customerId?: string | undefined;
    customerName?: string | undefined;
    lineItems?: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }[] | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
    totalAmount?: number | undefined;
    currency?: string | undefined;
    dueDate?: string | undefined;
    issueDate?: string | undefined;
    notes?: string | undefined;
    dealId?: string | undefined;
    projectId?: string | undefined;
}, {
    invoiceId: string;
    invoiceNumber?: string | undefined;
    customerId?: string | undefined;
    customerName?: string | undefined;
    lineItems?: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number | undefined;
    }[] | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
    totalAmount?: number | undefined;
    currency?: string | undefined;
    dueDate?: string | undefined;
    issueDate?: string | undefined;
    notes?: string | undefined;
    dealId?: string | undefined;
    projectId?: string | undefined;
}>;
export declare const CrmInvoiceVoidedPayload: z.ZodObject<{
    invoiceId: z.ZodString;
    invoiceNumber: z.ZodString;
    voidedAt: z.ZodString;
    voidedBy: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    originalAmount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    invoiceId: string;
    invoiceNumber: string;
    voidedAt: string;
    originalAmount: number;
    reason?: string | undefined;
    voidedBy?: string | undefined;
}, {
    invoiceId: string;
    invoiceNumber: string;
    voidedAt: string;
    originalAmount: number;
    reason?: string | undefined;
    voidedBy?: string | undefined;
}>;
export declare const CrmPaymentReceivedPayload: z.ZodObject<{
    paymentId: z.ZodString;
    invoiceId: z.ZodString;
    invoiceNumber: z.ZodString;
    customerId: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    paymentMethod: z.ZodOptional<z.ZodString>;
    paymentDate: z.ZodString;
    reference: z.ZodOptional<z.ZodString>;
    isPartialPayment: z.ZodDefault<z.ZodBoolean>;
    outstandingBalance: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    currency: string;
    paymentId: string;
    paymentDate: string;
    isPartialPayment: boolean;
    outstandingBalance: number;
    paymentMethod?: string | undefined;
    reference?: string | undefined;
}, {
    amount: number;
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    paymentId: string;
    paymentDate: string;
    currency?: string | undefined;
    paymentMethod?: string | undefined;
    reference?: string | undefined;
    isPartialPayment?: boolean | undefined;
    outstandingBalance?: number | undefined;
}>;
export declare const CrmDealClosedPayload: z.ZodObject<{
    dealId: z.ZodString;
    dealName: z.ZodString;
    customerId: z.ZodString;
    customerName: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    closedAt: z.ZodString;
    projectId: z.ZodOptional<z.ZodString>;
    revenueRecognitionMethod: z.ZodOptional<z.ZodEnum<["completed_contract", "percentage_completion", "time_and_material", "fixed_price"]>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    customerId: string;
    currency: string;
    dealId: string;
    dealName: string;
    closedAt: string;
    customerName?: string | undefined;
    projectId?: string | undefined;
    revenueRecognitionMethod?: "completed_contract" | "percentage_completion" | "time_and_material" | "fixed_price" | undefined;
}, {
    amount: number;
    customerId: string;
    dealId: string;
    dealName: string;
    closedAt: string;
    customerName?: string | undefined;
    currency?: string | undefined;
    projectId?: string | undefined;
    revenueRecognitionMethod?: "completed_contract" | "percentage_completion" | "time_and_material" | "fixed_price" | undefined;
}>;
export declare const CrmCustomerCreatedPayload: z.ZodObject<{
    customerId: z.ZodString;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    creditLimit: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    customerId: string;
    currency: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: Record<string, string> | undefined;
    creditLimit?: number | undefined;
}, {
    name: string;
    customerId: string;
    email?: string | undefined;
    currency?: string | undefined;
    phone?: string | undefined;
    address?: Record<string, string> | undefined;
    creditLimit?: number | undefined;
}>;
export declare const CrmCustomerUpdatedPayload: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    creditLimit: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
} & {
    customerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    name?: string | undefined;
    email?: string | undefined;
    currency?: string | undefined;
    phone?: string | undefined;
    address?: Record<string, string> | undefined;
    creditLimit?: number | undefined;
}, {
    customerId: string;
    name?: string | undefined;
    email?: string | undefined;
    currency?: string | undefined;
    phone?: string | undefined;
    address?: Record<string, string> | undefined;
    creditLimit?: number | undefined;
}>;
export declare const HrmsPayrollProcessedPayload: z.ZodObject<{
    payrollRunId: z.ZodString;
    payrollPeriod: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    processedAt: z.ZodString;
    totalGrossPay: z.ZodNumber;
    totalNetPay: z.ZodNumber;
    totalTaxWithheld: z.ZodNumber;
    totalDeductions: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    costCenterId: z.ZodOptional<z.ZodString>;
    employeeCount: z.ZodNumber;
    journalEntryInstructions: z.ZodArray<z.ZodObject<{
        accountCode: z.ZodString;
        description: z.ZodString;
        debit: z.ZodOptional<z.ZodNumber>;
        credit: z.ZodOptional<z.ZodNumber>;
        costCenterId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        accountCode: string;
        costCenterId?: string | undefined;
        debit?: number | undefined;
        credit?: number | undefined;
    }, {
        description: string;
        accountCode: string;
        costCenterId?: string | undefined;
        debit?: number | undefined;
        credit?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: string;
    payrollRunId: string;
    payrollPeriod: {
        start: string;
        end: string;
    };
    processedAt: string;
    totalGrossPay: number;
    totalNetPay: number;
    totalTaxWithheld: number;
    totalDeductions: number;
    employeeCount: number;
    journalEntryInstructions: {
        description: string;
        accountCode: string;
        costCenterId?: string | undefined;
        debit?: number | undefined;
        credit?: number | undefined;
    }[];
    costCenterId?: string | undefined;
}, {
    payrollRunId: string;
    payrollPeriod: {
        start: string;
        end: string;
    };
    processedAt: string;
    totalGrossPay: number;
    totalNetPay: number;
    totalTaxWithheld: number;
    totalDeductions: number;
    employeeCount: number;
    journalEntryInstructions: {
        description: string;
        accountCode: string;
        costCenterId?: string | undefined;
        debit?: number | undefined;
        credit?: number | undefined;
    }[];
    currency?: string | undefined;
    costCenterId?: string | undefined;
}>;
export declare const HrmsExpenseApprovedPayload: z.ZodObject<{
    expenseId: z.ZodString;
    employeeId: z.ZodString;
    employeeName: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    category: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    receiptDate: z.ZodString;
    approvedAt: z.ZodString;
    approvedBy: z.ZodString;
    projectId: z.ZodOptional<z.ZodString>;
    costCenterId: z.ZodOptional<z.ZodString>;
    reimbursable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: string;
    expenseId: string;
    employeeId: string;
    category: string;
    receiptDate: string;
    approvedAt: string;
    approvedBy: string;
    reimbursable: boolean;
    description?: string | undefined;
    projectId?: string | undefined;
    costCenterId?: string | undefined;
    employeeName?: string | undefined;
}, {
    amount: number;
    expenseId: string;
    employeeId: string;
    category: string;
    receiptDate: string;
    approvedAt: string;
    approvedBy: string;
    description?: string | undefined;
    currency?: string | undefined;
    projectId?: string | undefined;
    costCenterId?: string | undefined;
    employeeName?: string | undefined;
    reimbursable?: boolean | undefined;
}>;
export declare const HrmsEmployeeHiredPayload: z.ZodObject<{
    employeeId: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    department: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    salary: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    costCenterId: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    currency: string;
    employeeId: string;
    startDate: string;
    costCenterId?: string | undefined;
    department?: string | undefined;
    jobTitle?: string | undefined;
    salary?: number | undefined;
    managerId?: string | undefined;
}, {
    email: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    startDate: string;
    currency?: string | undefined;
    costCenterId?: string | undefined;
    department?: string | undefined;
    jobTitle?: string | undefined;
    salary?: number | undefined;
    managerId?: string | undefined;
}>;
export declare const HrmsEmployeeTerminatedPayload: z.ZodObject<{
    employeeId: z.ZodString;
    terminationDate: z.ZodString;
    terminationType: z.ZodEnum<["voluntary", "involuntary", "retirement"]>;
    finalSettlementAmount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    noticePeriodEndDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    employeeId: string;
    terminationDate: string;
    terminationType: "voluntary" | "involuntary" | "retirement";
    finalSettlementAmount?: number | undefined;
    noticePeriodEndDate?: string | undefined;
}, {
    employeeId: string;
    terminationDate: string;
    terminationType: "voluntary" | "involuntary" | "retirement";
    currency?: string | undefined;
    finalSettlementAmount?: number | undefined;
    noticePeriodEndDate?: string | undefined;
}>;
export declare const HrmsSalaryRevisedPayload: z.ZodObject<{
    employeeId: z.ZodString;
    previousSalary: z.ZodNumber;
    newSalary: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    effectiveDate: z.ZodString;
    costCenterId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    effectiveDate: string;
    currency: string;
    employeeId: string;
    previousSalary: number;
    newSalary: number;
    costCenterId?: string | undefined;
}, {
    effectiveDate: string;
    employeeId: string;
    previousSalary: number;
    newSalary: number;
    currency?: string | undefined;
    costCenterId?: string | undefined;
}>;
export declare const HrmsLeaveApprovedPayload: z.ZodObject<{
    leaveId: z.ZodString;
    employeeId: z.ZodString;
    leaveType: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    daysCount: z.ZodNumber;
    approvedBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    employeeId: string;
    approvedBy: string;
    startDate: string;
    leaveId: string;
    leaveType: string;
    endDate: string;
    daysCount: number;
}, {
    employeeId: string;
    approvedBy: string;
    startDate: string;
    leaveId: string;
    leaveType: string;
    endDate: string;
    daysCount: number;
}>;
export declare const PmProjectCreatedPayload: z.ZodObject<{
    projectId: z.ZodString;
    projectName: z.ZodString;
    customerId: z.ZodOptional<z.ZodString>;
    budget: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    billingType: z.ZodOptional<z.ZodEnum<["fixed_price", "time_and_material", "retainer", "milestone"]>>;
    managerId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    projectId: string;
    projectName: string;
    customerId?: string | undefined;
    startDate?: string | undefined;
    managerId?: string | undefined;
    endDate?: string | undefined;
    budget?: number | undefined;
    billingType?: "time_and_material" | "fixed_price" | "retainer" | "milestone" | undefined;
}, {
    projectId: string;
    projectName: string;
    customerId?: string | undefined;
    currency?: string | undefined;
    startDate?: string | undefined;
    managerId?: string | undefined;
    endDate?: string | undefined;
    budget?: number | undefined;
    billingType?: "time_and_material" | "fixed_price" | "retainer" | "milestone" | undefined;
}>;
export declare const PmProjectCompletedPayload: z.ZodObject<{
    projectId: z.ZodString;
    projectName: z.ZodString;
    customerId: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodString;
    totalBillableAmount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    finalBillingRequired: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    projectId: string;
    projectName: string;
    completedAt: string;
    finalBillingRequired: boolean;
    customerId?: string | undefined;
    totalBillableAmount?: number | undefined;
}, {
    projectId: string;
    projectName: string;
    completedAt: string;
    customerId?: string | undefined;
    currency?: string | undefined;
    totalBillableAmount?: number | undefined;
    finalBillingRequired?: boolean | undefined;
}>;
export declare const PmTimesheetApprovedPayload: z.ZodObject<{
    timesheetId: z.ZodString;
    employeeId: z.ZodString;
    projectId: z.ZodString;
    weekStartDate: z.ZodString;
    weekEndDate: z.ZodString;
    totalHours: z.ZodNumber;
    billableHours: z.ZodNumber;
    hourlyRate: z.ZodOptional<z.ZodNumber>;
    billableAmount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    approvedBy: z.ZodString;
    approvedAt: z.ZodString;
    costCenterId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    projectId: string;
    employeeId: string;
    approvedAt: string;
    approvedBy: string;
    timesheetId: string;
    weekStartDate: string;
    weekEndDate: string;
    totalHours: number;
    billableHours: number;
    costCenterId?: string | undefined;
    hourlyRate?: number | undefined;
    billableAmount?: number | undefined;
}, {
    projectId: string;
    employeeId: string;
    approvedAt: string;
    approvedBy: string;
    timesheetId: string;
    weekStartDate: string;
    weekEndDate: string;
    totalHours: number;
    billableHours: number;
    currency?: string | undefined;
    costCenterId?: string | undefined;
    hourlyRate?: number | undefined;
    billableAmount?: number | undefined;
}>;
export declare const PmMilestoneCompletedPayload: z.ZodObject<{
    milestoneId: z.ZodString;
    milestoneName: z.ZodString;
    projectId: z.ZodString;
    customerId: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodString;
    billingAmount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    percentageComplete: z.ZodOptional<z.ZodNumber>;
    invoiceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    projectId: string;
    completedAt: string;
    milestoneId: string;
    milestoneName: string;
    invoiceId?: string | undefined;
    customerId?: string | undefined;
    billingAmount?: number | undefined;
    percentageComplete?: number | undefined;
}, {
    projectId: string;
    completedAt: string;
    milestoneId: string;
    milestoneName: string;
    invoiceId?: string | undefined;
    customerId?: string | undefined;
    currency?: string | undefined;
    billingAmount?: number | undefined;
    percentageComplete?: number | undefined;
}>;
export declare const PmProjectBilledPayload: z.ZodObject<{
    projectId: z.ZodString;
    projectName: z.ZodString;
    customerId: z.ZodString;
    billingAmount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    billingPeriodStart: z.ZodOptional<z.ZodString>;
    billingPeriodEnd: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }, {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>, "many">;
    milestoneId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    currency: string;
    projectId: string;
    projectName: string;
    billingAmount: number;
    notes?: string | undefined;
    milestoneId?: string | undefined;
    billingPeriodStart?: string | undefined;
    billingPeriodEnd?: string | undefined;
}, {
    customerId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    projectId: string;
    projectName: string;
    billingAmount: number;
    currency?: string | undefined;
    notes?: string | undefined;
    milestoneId?: string | undefined;
    billingPeriodStart?: string | undefined;
    billingPeriodEnd?: string | undefined;
}>;
export declare const PmResourceAllocatedPayload: z.ZodObject<{
    allocationId: z.ZodString;
    employeeId: z.ZodString;
    projectId: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodString>;
    allocatedHoursPerWeek: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    allocationId: string;
    projectId: string;
    employeeId: string;
    startDate: string;
    endDate?: string | undefined;
    role?: string | undefined;
    allocatedHoursPerWeek?: number | undefined;
}, {
    allocationId: string;
    projectId: string;
    employeeId: string;
    startDate: string;
    endDate?: string | undefined;
    role?: string | undefined;
    allocatedHoursPerWeek?: number | undefined;
}>;
export declare const FaInvoiceStatusPayload: z.ZodObject<{
    invoiceId: z.ZodString;
    invoiceNumber: z.ZodString;
    status: z.ZodEnum<["paid", "partially_paid", "overdue", "written_off"]>;
    paidAmount: z.ZodOptional<z.ZodNumber>;
    outstandingAmount: z.ZodOptional<z.ZodNumber>;
    statusDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "paid" | "partially_paid" | "overdue" | "written_off";
    invoiceId: string;
    invoiceNumber: string;
    statusDate: string;
    paidAmount?: number | undefined;
    outstandingAmount?: number | undefined;
}, {
    status: "paid" | "partially_paid" | "overdue" | "written_off";
    invoiceId: string;
    invoiceNumber: string;
    statusDate: string;
    paidAmount?: number | undefined;
    outstandingAmount?: number | undefined;
}>;
export declare const FaExpenseReimbursedPayload: z.ZodObject<{
    expenseId: z.ZodString;
    employeeId: z.ZodString;
    reimbursedAmount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    reimbursedAt: z.ZodString;
    paymentReference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    expenseId: string;
    employeeId: string;
    reimbursedAmount: number;
    reimbursedAt: string;
    paymentReference?: string | undefined;
}, {
    expenseId: string;
    employeeId: string;
    reimbursedAmount: number;
    reimbursedAt: string;
    currency?: string | undefined;
    paymentReference?: string | undefined;
}>;
export declare const BUSINESS_BUS_SCHEMAS: Record<string, z.ZodTypeAny>;
export type CrmInvoiceCreatedPayload = z.infer<typeof CrmInvoiceCreatedPayload>;
export type CrmPaymentReceivedPayload = z.infer<typeof CrmPaymentReceivedPayload>;
export type CrmDealClosedPayload = z.infer<typeof CrmDealClosedPayload>;
export type HrmsPayrollProcessedPayload = z.infer<typeof HrmsPayrollProcessedPayload>;
export type HrmsExpenseApprovedPayload = z.infer<typeof HrmsExpenseApprovedPayload>;
export type HrmsEmployeeHiredPayload = z.infer<typeof HrmsEmployeeHiredPayload>;
export type PmProjectBilledPayload = z.infer<typeof PmProjectBilledPayload>;
export type PmTimesheetApprovedPayload = z.infer<typeof PmTimesheetApprovedPayload>;
export type FaInvoiceStatusPayload = z.infer<typeof FaInvoiceStatusPayload>;
//# sourceMappingURL=business-bus.d.ts.map