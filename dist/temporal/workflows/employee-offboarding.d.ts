/**
 * Employee Offboarding Workflow (ADR-014).
 *
 * Triggered when HRMS publishes hrms.employee.terminated.
 * Coordinates deallocation across PM, CRM, and final settlement in FA.
 *
 * Steps:
 *   1. Parallel: PM deallocates employee + CRM revokes client access
 *   2. HRMS computes final settlement
 *   3. FA posts termination journal entry
 *   4. HRMS marks settlement complete
 */
export interface EmployeeOffboardingInput {
    tenantId: string;
    correlationId: string;
    employeeId: string;
    terminationDate: string;
    terminationType: 'voluntary' | 'involuntary' | 'retirement';
    finalSettlementAmount?: number;
    currency: string;
}
export declare function employeeOffboardingWorkflow(input: EmployeeOffboardingInput): Promise<void>;
//# sourceMappingURL=employee-offboarding.d.ts.map