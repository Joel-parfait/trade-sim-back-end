import { Response } from 'express';
import pool from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// 1. Récupérer tous les utilisateurs (avec logique de visibilité)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  const { id, role } = req.user!;
  try {
    let query = `
      SELECT u.id, u.username, u.email, u.role, u.status, u.referred_by, w.balance, u.created_at 
      FROM users u 
      JOIN wallets w ON u.id = w.user_id
    `;
    let params: any[] = [];

    // Si c'est un simple admin, il ne voit que ses filleuls
    if (role === 'admin') {
      query += ' WHERE u.referred_by = $1';
      params.push(id);
    }
    
    query += ' ORDER BY u.created_at DESC';
    const users = await pool.query(query, params);
    res.json(users.rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs." });
  }
};

// 2. Modifier la balance d'un utilisateur
export const updateUserBalance = async (req: AuthRequest, res: Response) => {
  const { targetUserId, amount, type } = req.body; // type: 'add' ou 'set'
  const { id: adminId, role } = req.user!;

  try {
    // Vérification des droits
    if (role === 'admin') {
      const check = await pool.query('SELECT id FROM users WHERE id = $1 AND referred_by = $2', [targetUserId, adminId]);
      if (check.rows.length === 0) return res.status(403).json({ message: "Utilisateur non trouvé dans vos filleuls." });
    }

    if (type === 'add') {
      await pool.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [amount, targetUserId]);
    } else {
      await pool.query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [amount, targetUserId]);
    }

    res.json({ message: "Solde mis à jour avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du solde." });
  }
};

// 3. Suspendre ou Activer un utilisateur
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  const { targetUserId, status } = req.body; // 'active', 'suspended', 'banned'
  const { id: adminId, role } = req.user!;

  try {
    // Vérification des droits (Seul Super Admin peut bannir, Admin peut suspendre ses filleuls)
    if (role === 'admin') {
      const check = await pool.query('SELECT id FROM users WHERE id = $1 AND referred_by = $2', [targetUserId, adminId]);
      if (check.rows.length === 0) return res.status(403).json({ message: "Action non autorisée sur cet utilisateur." });
    }

    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, targetUserId]);
    res.json({ message: `Statut utilisateur mis à jour : ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du changement de statut." });
  }
};

export const getAllTrades = async (req: AuthRequest, res: Response) => {
    // Même logique : Admin voit les trades de ses filleuls, Super Admin voit tout
    const { id, role } = req.user!;
    try {
        let query = 'SELECT t.*, u.username FROM trades t JOIN users u ON t.user_id = u.id';
        let params = [];
        if (role === 'admin') {
            query += ' WHERE u.referred_by = $1';
            params.push(id);
        }
        const trades = await pool.query(query + ' ORDER BY start_time DESC', params);
        res.json(trades.rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur récupération trades." });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { targetUserId } = req.params;
  const { id: adminId, role } = req.user!;

  try {
    // 1. Vérification des droits (Admin ne peut supprimer que ses filleuls)
    if (role === 'admin') {
      const check = await pool.query('SELECT id FROM users WHERE id = $1 AND referred_by = $2', [targetUserId, adminId]);
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer cet utilisateur." });
      }
    }

    // 2. Nettoyage des références de parrainage pour ne pas casser la base
    await pool.query('UPDATE users SET referred_by = NULL WHERE referred_by = $1', [targetUserId]);

    // 3. Suppression (Cascades gérées par la DB pour wallets, trades, etc.)
    await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);

    res.json({ message: "Utilisateur et toutes ses données supprimés." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { targetUserId, role } = req.body; // 'admin' ou 'user'
  const { role: adminRole } = req.user!;

  try {
    // SÉCURITÉ CRITIQUE : Seul un Super Admin peut changer les rôles
    if (adminRole !== 'super_admin') {
      return res.status(403).json({ message: "Seul le Super Administrateur peut modifier les rangs." });
    }

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, targetUserId]);
    res.json({ message: "Rang mis à jour avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du changement de rang." });
  }
};