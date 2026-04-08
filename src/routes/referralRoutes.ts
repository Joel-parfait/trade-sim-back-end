import express from 'express';
import { getReferralStats } from '../controllers/referralController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// On protège la route avec authenticateToken pour être sûr 
// que seul l'utilisateur connecté voit ses propres stats
router.get('/stats', authenticateToken, getReferralStats);

export default router;