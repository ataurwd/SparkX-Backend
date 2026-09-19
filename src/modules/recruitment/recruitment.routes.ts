import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getJobs,
  createJob,
  getJobById,
  updateJob,
  getCandidates,
  createCandidate,
  updateCandidateStage,
  addCandidateNote,
  updateCandidateOffer,
  getInterviews,
  scheduleInterview
} from './recruitment.controller';

const router = Router();

router.use(authenticate);

// Jobs
router.get('/jobs', getJobs);
router.post('/jobs', createJob);
router.get('/jobs/:id', getJobById);
router.put('/jobs/:id', updateJob);

// Candidates & ATS Pipeline
router.get('/candidates', getCandidates);
router.post('/candidates', createCandidate);
router.put('/candidates/:id/stage', updateCandidateStage);
router.post('/candidates/:id/notes', addCandidateNote);
router.put('/candidates/:id/offer', updateCandidateOffer);

// Interviews
router.get('/interviews', getInterviews);
router.post('/interviews', scheduleInterview);

export default router;
