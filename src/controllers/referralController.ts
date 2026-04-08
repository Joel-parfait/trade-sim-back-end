import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getReferralStats = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    // 1. Stats globales
    const countRes = await pool.query("SELECT COUNT(*) FROM users WHERE referred_by = $1", [userId]);
    const earningsRes = await pool.query("SELECT SUM(amount) as total FROM transactions WHERE user_id = $1 AND type = 'referral_bonus'", [userId]);
    const userRes = await pool.query("SELECT referral_code FROM users WHERE id = $1", [userId]);

    // 2. Liste détaillée des filleuls
    // On récupère le username, la date de création, et on assume un gain fixe de 50$ (ton réglage actuel)
    const referralsList = await pool.query(
      `SELECT email, created_at, 'active' as status 
       FROM users 
       WHERE referred_by = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      totalReferrals: parseInt(countRes.rows[0].count),
      totalEarnings: parseFloat(earningsRes.rows[0].total || 0),
      referralCode: userRes.rows[0].referral_code,
      referrals: referralsList.rows // La liste pour le tableau
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur stats parrainage" });
  }
};