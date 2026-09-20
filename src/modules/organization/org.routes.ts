import { Router } from 'express';
import {
  getDepartments,
  createDepartment,
  getTeams,
  createTeam,
  assignTeamMember,
  removeTeamMember,
  updateTeamLead,
  getDesignations,
  createDesignation,
  getRoles,
  createRole,
  updateRolePermissions,
  assignUserRole,
  getRoleAssignments,
  getOrgTree,
  assignEmployeeToDepartment,
  getDepartmentEmployees
} from './org.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// All organization routes require authenticated session
router.use(authenticate);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.get('/departments/:id/employees', getDepartmentEmployees);
router.post('/departments/:id/assign', assignEmployeeToDepartment);

// Teams
router.get('/teams', getTeams);
router.post('/teams', createTeam);
router.post('/teams/:id/members', assignTeamMember);
router.delete('/teams/:id/members/:employeeId', removeTeamMember);
router.patch('/teams/:id/lead', updateTeamLead);

// Designations
router.get('/designations', getDesignations);
router.post('/designations', createDesignation);

// Org Chart Hierarchy Tree
router.get('/tree', getOrgTree);

// RBAC Roles & Assignments
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id/permissions', updateRolePermissions);
router.get('/roles/assignments', getRoleAssignments);
router.post('/roles/assign', assignUserRole);

export default router;
