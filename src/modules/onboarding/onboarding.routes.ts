import { Router } from 'express';
import {
  getOnboardingChecklists,
  toggleOnboardingTask,
  createOnboardingChecklist
} from './onboarding.controller';

const router = Router();

router.get('/', getOnboardingChecklists);
router.put('/:id/tasks/:taskIndex/toggle', toggleOnboardingTask);
router.post('/', createOnboardingChecklist);

export default router;
