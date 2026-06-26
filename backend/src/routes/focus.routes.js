import { Router } from 'express';
import {
  startSession,
  endSession,
  getCurrentSession,
  getSessionHistory,
} from '../controllers/focus.controller.js';
import protect from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { startSessionSchema, endSessionSchema } from '../validators/focus.validation.js';

const router = Router();

// Protect all routes
router.use(protect);

router.post('/start', validate(startSessionSchema), startSession);
router.post('/end', validate(endSessionSchema), endSession);
router.get('/current', getCurrentSession);
router.get('/history', getSessionHistory);

export default router;
