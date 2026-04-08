import { Router } from 'express';
import { getWalletBalance, getTransactionHistory } from '../controllers/walletController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Toutes ces routes demandent d'être connecté (Bearer Token)
router.get('/balance', authenticateToken, getWalletBalance);
router.get('/transactions', authenticateToken, getTransactionHistory);

export default router;