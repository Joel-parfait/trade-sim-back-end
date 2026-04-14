import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    /**
     * MÉTHODE "ADMIN STYLE" : 
     * On récupère uniquement les données brutes sans calculs SQL.
     * On retire le GROUP BY, les sous-requêtes et le ORDER BY complexe.
     * Le tri et le calcul du "portfolioValue" se feront côté Frontend.
     */
    const query = `
      SELECT 
        u.id,
        u.username, 
        u.email, 
        u.avatar_id,
        w.balance, 
        w.total_profit
      FROM users u
      INNER JOIN wallets w ON u.id = w.user_id
      WHERE u.is_admin = FALSE
    `;

    // Exécution de la requête simple
    const result = await pool.query(query);
    
    // On renvoie les lignes telles quelles. 
    // Le Frontend s'occupera du .sort() et du .map() comme sur la page Admin.
    res.json(result.rows);

  } catch (error) {
    // Si même cette requête crash, c'est un problème de connexion à la DB
    console.error("ERREUR CRITIQUE SQL LEADERBOARD (SIMPLE):", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la récupération des données brutes",
      error: process.env.NODE_ENV === 'development' ? error : {} 
    });
  }
};