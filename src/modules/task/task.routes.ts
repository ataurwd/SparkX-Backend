import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getMyTasks,
  addCommentToTask
} from './task.controller';

const router = Router();

router.get('/', optionalAuthenticate, getTasks);
router.get('/my-tasks', authenticate, getMyTasks);
router.post('/', optionalAuthenticate, createTask);
router.put('/:id/status', optionalAuthenticate, updateTaskStatus);
router.put('/:id', optionalAuthenticate, updateTask);
router.delete('/:id', optionalAuthenticate, deleteTask);
router.post('/:id/comments', optionalAuthenticate, addCommentToTask);

export default router;
