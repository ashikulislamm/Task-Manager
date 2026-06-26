import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  deleteAccount,
  refreshSession,
} from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
} from '../validators/auth.validation.js';
import protect from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshSession);
router.get('/me', protect, getMe);
router.patch('/profile', protect, validate(updateProfileSchema), updateProfile);
router.patch('/password', protect, validate(updatePasswordSchema), updatePassword);
router.delete('/delete', protect, deleteAccount);

export default router;
