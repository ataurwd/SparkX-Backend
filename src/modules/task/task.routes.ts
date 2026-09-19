import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getMyTasks
} from './task.controller';

const router = Router();

router.get('/', authenticate, getTasks);
router.get('/my-tasks', authenticate, getMyTasks);
router.post('/', authenticate, createTask);
router.put('/:id/status', authenticate, updateTaskStatus);
router.put('/:id', authenticate, updateTask);
router.delete('/:id', authenticate, deleteTask);

export default router;
