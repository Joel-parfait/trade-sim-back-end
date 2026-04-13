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
        COALESCE(w.total_profit, 0) as total_profit,
        COUNT(t.id) as total_trades
      FROM users u
      INNER JOIN wallets w ON u.id = w.user_id
      LEFT JOIN trades t ON u.id = t.user_id
      WHERE u.is_admin = FALSE
      GROUP BY u.id, u.username, u.email, u.avatar_id, w.balance, w.total_profit
      ORDER BY (w.balance + COALESCE(w.total_profit, 0)) DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    
    const rankings = result.rows.map((row, index) => {
      // Calcul de la valeur totale en JS pour plus de sécurité
      const balance = parseFloat(row.balance || 0);
      const profit = parseFloat(row.total_profit || 0);
      
      return {
        rank: index + 1,
        username: row.username || (row.email ? row.email.split('@')[0] : 'Trader'),
        portfolioValue: balance + profit,
        totalTrades: parseInt(row.total_trades || 0),
        avatarId: row.avatar_id,
        userId: row.id 
      };
    });

    res.json(rankings);
  } catch (error) {
    // Ce log s'affichera dans ton terminal de commande (backend)
    console.error("Détail Erreur SQL Neon:", error);
    res.status(500).json({ message: "Erreur lors de la récupération du classement" });
  }
};