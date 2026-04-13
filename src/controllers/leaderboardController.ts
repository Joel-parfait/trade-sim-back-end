import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    // Requête optimisée : on calcule la valeur totale (balance + profit)
    // et on compte les trades dans une sous-requête pour éviter les bugs de GROUP BY
    const query = `
      SELECT 
        u.id,
        u.username, 
        u.email, 
        u.avatar_id,
        w.balance, 
        COALESCE(w.total_profit, 0) as total_profit,
        (SELECT COUNT(*) FROM trades t WHERE t.user_id = u.id) as total_trades
      FROM users u
      INNER JOIN wallets w ON u.id = w.user_id
      WHERE u.is_admin = FALSE
      ORDER BY (w.balance + COALESCE(w.total_profit, 0)) DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    
    // Formatage des données pour le frontend
    const rankings = result.rows.map((row, index) => {
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
    // IMPORTANT : Regarde les logs de ton terminal backend pour voir l'erreur exacte
    console.error("ERREUR CRITIQUE SQL LEADERBOARD:", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul du classement" });
  }
};