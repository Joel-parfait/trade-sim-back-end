import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// --- LOGIQUE CORRIGÉE : MULTIPLICATEUR DYNAMIQUE ---
const calculateTarget = (amount: number): number => {
  if (amount >= 1000) return amount * 13;   // Ex: 1000 -> 13000 (x13)
  if (amount >= 500) return amount * 12;    // Ex: 500 -> 6000 (x12)
  if (amount >= 300) return amount * 11.66; // Ex: 300 -> 3500 (approx x11.66)
  if (amount >= 100) return amount * 10;    // Ex: 100 -> 1000 (x10) | 200 -> 2000
  return amount * 2;
};

// Lancer un nouveau trade
export const startTrade = async (req: AuthRequest, res: Response) => {
  const amount = parseFloat(req.body.amount);
  const crypto_symbol = req.body.crypto_symbol;
  const userId = req.user?.id;

  if (!amount || isNaN(amount) || !crypto_symbol) {
    return res.status(400).json({ 
      message: "Données invalides. 'amount' (nombre) et 'crypto_symbol' (string) sont requis." 
    });
  }

  if (amount < 100) {
    return res.status(400).json({ message: "Le montant minimum pour trader est de 100$." });
  }

  try {
    // Vérifier si un trade est déjà en cours
    const activeCheck = await pool.query(
      "SELECT id FROM trades WHERE user_id = $1 AND status = 'running'",
      [userId]
    );

    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ message: "Vous avez déjà un trade en cours." });
    }

    const wallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
    
    if (wallet.rows.length === 0 || parseFloat(wallet.rows[0].balance) < amount) {
      return res.status(400).json({ message: "Solde insuffisant ou portefeuille introuvable." });
    }

    // Débit du solde
    await pool.query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [amount, userId]);

    const targetProfit = calculateTarget(amount);
    // Modifier ici pour 24h ou 1min selon tes besoins de test
    const endTime = new Date(Date.now() + 5 * 60 * 1000); 

    const newTrade = await pool.query(
      `INSERT INTO trades 
      (user_id, crypto_symbol, amount_invested, target_profit, start_price, current_simulated_price, end_time, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, crypto_symbol, amount, targetProfit, 50000.0, 50000.0, endTime, 'running']
    );

    res.status(201).json({ 
      message: "Robot démarré avec succès", 
      trade: newTrade.rows[0],
      target_profit: targetProfit 
    });
  } catch (error) {
    console.error("Détail erreur SQL:", error);
    res.status(500).json({ message: "Erreur serveur lors du lancement." });
  }
};

// Récupérer UNIQUEMENT le robot en cours (pour la page Trade)
export const getActiveTrades = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const trades = await pool.query(
      "SELECT * FROM trades WHERE user_id = $1 AND status = 'running' ORDER BY start_time DESC",
      [userId]
    );
    res.json(trades.rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des trades actifs." });
  }
};

// RÉCUPÉRER TOUT L'HISTORIQUE (Pour la page Wallet)
// J'ai retiré le filtre "status != 'running'" pour que tu vois TOUT (actifs + finis)
export const getTradeHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const trades = await pool.query(
      "SELECT * FROM trades WHERE user_id = $1 ORDER BY start_time DESC",
      [userId]
    );
    res.json(trades.rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique." });
  }
};

// Finaliser un trade et créditer le solde
export const finalizeTrade = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const tradeQuery = await pool.query(
      "SELECT * FROM trades WHERE user_id = $1 AND status = 'running' LIMIT 1",
      [userId]
    );

    if (tradeQuery.rows.length === 0) {
      return res.status(404).json({ message: "Aucun trade actif trouvé." });
    }

    const trade = tradeQuery.rows[0];
    const now = new Date();
    const endTime = new Date(trade.end_time);

    // Marge de 2 secondes pour éviter les erreurs de synchro
    if (now.getTime() < (endTime.getTime() - 2000)) {
      return res.status(400).json({ 
        message: "Sécurité : Le trade est encore en cours. Retrait impossible." 
      });
    }

    await pool.query('BEGIN');

    const finalAmount = parseFloat(trade.target_profit);

    // 1. Créditer le portefeuille
    await pool.query(
      "UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2",
      [finalAmount, userId]
    );

    // 2. Marquer le trade comme terminé
    await pool.query(
      "UPDATE trades SET status = 'completed', end_time = NOW() WHERE id = $1",
      [trade.id]
    );

    // 3. Optionnel : Ajouter une ligne dans la table transactions pour un historique propre
    await pool.query(
      "INSERT INTO transactions (user_id, type, amount) VALUES ($1, $2, $3)",
      [userId, 'trade_profit', finalAmount]
    );

    await pool.query('COMMIT');
    res.json({ message: "Retrait réussi !", credited_amount: finalAmount });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Erreur finalize:", error);
    res.status(500).json({ message: "Erreur serveur lors du retrait." });
  }
};