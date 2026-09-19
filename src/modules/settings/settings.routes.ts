import { Router } from 'express';
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  getPlatformOverview
} from './settings.controller';

const router = Router();

router.get('/organization', getOrganizationSettings);
router.put('/organization', updateOrganizationSettings);
router.get('/platform/overview', getPlatformOverview);

export default router;
