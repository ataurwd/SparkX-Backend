import { Router } from 'express';
import { getAssets, createAsset, assignAsset, updateAssetStatus } from './asset.controller';

const router = Router();

router.get('/', getAssets);
router.post('/', createAsset);
router.put('/:id/assign', assignAsset);
router.put('/:id/status', updateAssetStatus);

export default router;
