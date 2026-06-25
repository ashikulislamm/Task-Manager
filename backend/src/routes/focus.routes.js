import { Router } from 'express';
import {
  startSession,
  endSession,
  getCurrentSession,
  getSessionHistory,
} from '../controllers/focus.controller.js';
import protect from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(protect);

router.post('/start', startSession);
router.post('/end', endSession);
router.get('/current', getCurrentSession);
router.get('/history', getSessionHistory);

export default router;
