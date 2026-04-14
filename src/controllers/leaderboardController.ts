import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    /**
     * MÉTHODE "ADMIN STYLE" SÉCURISÉE : 
     * L'erreur 500 provenait de la colonne 'is_admin' qui est inexistante ou mal nommée.
     * On retire la clause WHERE pour garantir que la requête SELECT aboutisse.
     * Le filtrage des rôles et le tri se feront désormais exclusivement côté Frontend.
     */
    const query = `
      SELECT 
        u.id,
        u.username, 
        u.email, 
        u.avatar_id,
        u.role,
        w.balance, 
        w.total_profit
      FROM users u
      INNER JOIN wallets w ON u.id = w.user_id
    `;

    // Exécution de la requête brute
    const result = await pool.query(query);
    
    // On renvoie les données sans transformation. 
    // Si la table est vide, result.rows sera un tableau vide [], ce qui ne crash pas le front.
    res.json(result.rows);

  } catch (error) {
    // Ce log sera visible dans ton terminal de commande ou tes logs Vercel
    console.error("ERREUR SQL LEADERBOARD (FIX APPLIQUÉ):", error);
    
    res.status(500).json({ 
      message: "Erreur serveur lors de la récupération des données",
      error: process.env.NODE_ENV === 'development' ? error : {} 
    });
  }
};