import { Router } from 'express';
import authRoutes from './auth.routes.js';
import taskRoutes from './task.routes.js';
import analyticsRoutes from './analytics.routes.js';
import activityRoutes from './activity.routes.js';
import focusRoutes from './focus.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/activities', activityRoutes);
router.use('/focus', focusRoutes);

export default router;
