import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route accessible uniquement aux utilisateurs connectés
router.get('/', authenticateToken, getLeaderboard);

export default router;