import { Router } from 'express';
// Ajoute finalizeTrade à l'import
import { startTrade, getActiveTrades, getTradeHistory, finalizeTrade } from '../controllers/tradeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/start', authenticateToken, startTrade);
router.get('/active', authenticateToken, getActiveTrades);
router.get('/history', authenticateToken, getTradeHistory);

// Nouvelle route pour le bouton Withdraw
router.post('/finalize', authenticateToken, finalizeTrade); 


export default router;