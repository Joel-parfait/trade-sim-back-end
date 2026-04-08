import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getWalletBalance = async (req: AuthRequest, res: Response) => {
  try {
    // L'ID de l'utilisateur est extrait du Token JWT grâce au middleware
    const userId = req.user?.id;

    const walletResult = await pool.query(
      'SELECT balance, bonus_balance, total_profit FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ message: "Portefeuille non trouvé." });
    }

    res.json(walletResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération du solde." });
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const transactions = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(transactions.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique." });
  }
};