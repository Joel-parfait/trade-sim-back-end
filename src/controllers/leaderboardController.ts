import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.username, 
        u.email, 
        u.avatar_id,
        w.balance, 
        w.total_profit,
        (w.balance + w.total_profit) as total_value,
        COUNT(t.id) as total_trades
      FROM users u
      JOIN wallets w ON u.id = w.user_id
      LEFT JOIN trades t ON u.id = t.user_id
      WHERE u.is_admin = FALSE
      GROUP BY u.id, u.username, u.email, u.avatar_id, w.balance, w.total_profit
      ORDER BY total_value DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    
    const rankings = result.rows.map((row, index) => ({
      rank: index + 1,
      // On utilise le username de la BD, s'il est vide on coupe l'email par sécurité
      username: row.username || row.email.split('@')[0],
      portfolioValue: parseFloat(row.total_value),
      totalTrades: parseInt(row.total_trades || 0),
      avatarId: row.avatar_id,
      userId: row.id 
    }));

    res.json(rankings);
  } catch (error) {
    console.error("Erreur Leaderboard SQL:", error);
    res.status(500).json({ message: "Erreur lors de la récupération du classement" });
  }
};