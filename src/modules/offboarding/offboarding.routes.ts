import { Router } from 'express';
import {
  getOffboardings,
  createOffboarding,
  toggleClearanceItem,
  submitExitInterview
} from './offboarding.controller';

const router = Router();

router.get('/', getOffboardings);
router.post('/', createOffboarding);
router.put('/:id/clearance/:itemIndex/toggle', toggleClearanceItem);
router.put('/:id/exit-interview', submitExitInterview);

export default router;
