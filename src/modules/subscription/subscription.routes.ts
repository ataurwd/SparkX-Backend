import { Router } from 'express';
import { getCurrentSubscription, upgradeSubscription, addSeats } from './subscription.controller';

const router = Router();

router.get('/current', getCurrentSubscription);
router.put('/upgrade', upgradeSubscription);
router.post('/seats', addSeats);

export default router;
