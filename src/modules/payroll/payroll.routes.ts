import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  getSalaryStructure,
  updateSalaryStructure,
  generateMonthlyPayroll,
  getPayrollBatches,
  getPayrollBatchById,
  approvePayrollBatch,
  payPayrollBatch,
  getPayslipById,
  getMyPayslips
} from './payroll.controller';

const router = Router();

// Employee self-service payslip history
router.get('/my-payslips', authenticate, getMyPayslips);

// Individual payslip details (printable)
router.get('/payslips/:id', authenticate, getPayslipById);

// Salary structure management
router.get('/salary-structure/:employeeId', authenticate, getSalaryStructure);
router.put('/salary-structure/:employeeId', authenticate, requirePermission('payroll.manage'), updateSalaryStructure);

// Monthly payroll batch operations
router.post('/generate', authenticate, requirePermission('payroll.manage'), generateMonthlyPayroll);
router.get('/batches', authenticate, requirePermission('payroll.manage'), getPayrollBatches);
router.get('/batches/:id', authenticate, requirePermission('payroll.manage'), getPayrollBatchById);
router.put('/batches/:id/approve', authenticate, requirePermission('payroll.approve'), approvePayrollBatch);
router.put('/batches/:id/pay', authenticate, requirePermission('payroll.approve'), payPayrollBatch);

export default router;
