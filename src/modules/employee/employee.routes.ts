import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument
} from './employee.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Employee Directory & Profiles (allow optional auth for directory lookups/selectors)
router.get('/', optionalAuthenticate, getEmployees);

router.use(authenticate);

router.get('/:id', requirePermission('employees.read'), getEmployeeById);
router.post('/', requirePermission('employees.write'), createEmployee);
router.put('/:id', requirePermission('employees.write'), updateEmployee);
router.delete('/:id', requirePermission('employees.delete'), deleteEmployee);

// Employee Documents Vault
router.get('/:id/documents', requirePermission('employees.read'), getEmployeeDocuments);
router.post('/:id/documents', requirePermission('employees.write'), uploadEmployeeDocument);
router.delete('/:id/documents/:docId', requirePermission('employees.write'), deleteEmployeeDocument);

export default router;
