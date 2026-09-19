import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getReviewCycles,
  createReviewCycle,
  getReviews,
  getMyReviews,
  getReviewById,
  submitSelfAssessment,
  submitManagerAssessment,
  acknowledgeReview
} from './review.controller';

const router = Router();

router.use(authenticate);

// Cycles
router.get('/cycles', getReviewCycles);
router.post('/cycles', createReviewCycle);

// Reviews
router.get('/', getReviews);
router.get('/my-reviews', getMyReviews);
router.get('/:id', getReviewById);
router.put('/:id/self', submitSelfAssessment);
router.put('/:id/manager', submitManagerAssessment);
router.put('/:id/acknowledge', acknowledgeReview);

export default router;
