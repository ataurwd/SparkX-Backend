import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getGoals,
  getGoalSummary,
  getGoalById,
  createGoal,
  updateGoal,
  updateKeyResult,
  addKeyResult,
  deleteGoal
} from './goal.controller';

const router = Router();

router.use(authenticate);

router.get('/', getGoals);
router.get('/summary', getGoalSummary);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

// Key Result updates
router.post('/:id/key-results', addKeyResult);
router.put('/:id/key-results/:krId', updateKeyResult);

export default router;
