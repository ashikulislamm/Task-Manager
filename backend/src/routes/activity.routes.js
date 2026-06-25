import { Router } from 'express';
import { getActivities } from '../controllers/activity.controller.js';
import protect from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(protect);

router.get('/', getActivities);

export default router;
