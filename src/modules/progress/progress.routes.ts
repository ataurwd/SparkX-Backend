import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getWorkProgress } from './progress.controller';

const router = Router();

router.get('/', authenticate, getWorkProgress);

export default router;
