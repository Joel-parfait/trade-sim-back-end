import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    // Utilisation de sous-requête pour le COUNT afin d'éviter les erreurs de GROUP BY complexes
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

    console.log("--- Tentative de récupération du Leaderboard ---");
    const result = await pool.query(query);
    console.log(`Données brutes SQL : ${result.rows.length} utilisateurs trouvés.`);
    
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

    console.log("JSON final envoyé au frontend prêt.");
    res.json(rankings);
  } catch (error) {
    console.error("ERREUR CRITIQUE BACKEND LEADERBOARD :", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul du classement" });
  }
};