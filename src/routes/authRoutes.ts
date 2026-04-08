import { Router } from 'express';
import { 
  register, 
  login, 
  getMe, 
  verifyOTP, 
  updateProfile, 
  updatePassword,
  forgotPassword, // <--- Ajout
  resetPassword  // <--- Ajout
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// --- Routes Publiques ---
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword); // <--- Nouvelle route
router.post('/reset-password', resetPassword);   // <--- Nouvelle route

// --- Routes Protégées ---
router.get('/me', authenticateToken, getMe);
router.put('/update-profile', authenticateToken, updateProfile);
router.put('/update-password', authenticateToken, updatePassword);

export default router;