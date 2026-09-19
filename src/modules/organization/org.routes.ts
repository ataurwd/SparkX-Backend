import { Router } from 'express';
import {
  getDepartments,
  createDepartment,
  getTeams,
  createTeam,
  getDesignations,
  createDesignation,
  getRoles,
  updateRolePermissions,
  getOrgTree
} from './org.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// All organization routes require authenticated session
router.use(authenticate);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', requirePermission('org.manage'), createDepartment);

// Teams
router.get('/teams', getTeams);
router.post('/teams', requirePermission('org.manage'), createTeam);

// Designations
router.get('/designations', getDesignations);
router.post('/designations', requirePermission('org.manage'), createDesignation);

// Org Chart Hierarchy Tree
router.get('/tree', getOrgTree);

// RBAC Roles
router.get('/roles', requirePermission('org.manage'), getRoles);
router.put('/roles/:id/permissions', requirePermission('org.manage'), updateRolePermissions);

export default router;
