import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from './project.controller';

const router = Router();

router.get('/', authenticate, getProjects);
router.get('/:id', authenticate, getProjectById);
router.post('/', authenticate, requirePermission('projects.create'), createProject);
router.put('/:id', authenticate, requirePermission('projects.edit'), updateProject);
router.delete('/:id', authenticate, requirePermission('projects.delete'), deleteProject);

export default router;
