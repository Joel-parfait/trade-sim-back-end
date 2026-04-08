import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { sendVerificationEmail } from '../utils/emailService.js'; // Assurez-vous que le chemin est correct

// ==========================================
// INSCRIPTION (REGISTER)
// ==========================================
export const register = async (req: Request, res: Response) => {
  const { username, email, password, referralCode } = req.body;
  const client = await pool.connect(); 

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    await client.query('BEGIN'); 

    // 2. Hachage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Générer code parrainage et OTP
    const myReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Gérer le parrainage
    let referredBy = null;
    if (referralCode && referralCode.trim() !== "") {
      const referrer = await client.query(
        'SELECT id FROM users WHERE UPPER(referral_code) = UPPER($1)', 
        [referralCode.trim()]
      );
      if (referrer.rows.length > 0) {
        referredBy = referrer.rows[0].id;
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: "Le code de parrainage est invalide." });
      }
    }

    // 5. Créer l'utilisateur (Rôle par défaut: user)
    const newUser = await client.query(
      `INSERT INTO users (username, email, password_hash, referral_code, otp_code, is_verified, referred_by, avatar_id, role) 
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, 1, 'user') RETURNING id, email`,
      [username, email.toLowerCase().trim(), hashedPassword, myReferralCode, otp, referredBy]
    );

    const userId = newUser.rows[0].id;

    // 6. Créer le portefeuille
    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)', 
      [userId, 100.00]
    );

    // 7. Bonus Parrainage
    if (referredBy) {
      const BONUS_AMOUNT = 5.00;
      await client.query(
        'UPDATE wallets SET balance = balance + $1, bonus_balance = bonus_balance + $1 WHERE user_id = $2', 
        [BONUS_AMOUNT, referredBy]
      );
      await client.query(
        "INSERT INTO transactions (user_id, type, amount, status) VALUES ($1, 'referral_bonus', $2, 'completed')", 
        [referredBy, BONUS_AMOUNT]
      );
    }

    // 8. ENVOI DE L'EMAIL RÉEL (HOSTINGER)
    await sendVerificationEmail(email.toLowerCase().trim(), username, otp);

    await client.query('COMMIT'); 

    console.log(`✅ Mail envoyé à ${email} | OTP: ${otp}`);

    res.status(201).json({ 
      message: "Compte créé. Veuillez vérifier votre boîte mail pour le code OTP.", 
      email: email 
    });

  // Dans ton backend: src/controllers/authController.ts

} catch (error: any) {
    await client.query('ROLLBACK');
    
    // TRÈS IMPORTANT : Regarde ton terminal backend pour lire ce message
    console.error("DÉTAIL DE L'ERREUR D'INSCRIPTION:", error); 
    
    // On renvoie le message d'erreur précis au Front pour débugger
    res.status(500).json({ 
        message: "Erreur lors de l'inscription.", 
        error: error.message 
    });
}
};

// ==========================================
// CONNEXION (LOGIN)
// ==========================================
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const user = userResult.rows[0];

    if (user.is_verified === false) {
      return res.status(403).json({ 
        message: "Compte non vérifié. Veuillez entrer le code OTP.",
        requireVerification: true,
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        isAdmin: user.role === 'admin' || user.role === 'super_admin' 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Connexion réussie",
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        avatar_id: user.avatar_id,
        role: user.role 
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion." });
  }
};

// ==========================================
// VÉRIFICATION OTP
// ==========================================
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND otp_code = $2',
      [email.toLowerCase().trim(), code]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Code de vérification incorrect." });
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    res.json({ message: "Votre compte a été vérifié avec succès !" });
  } catch (error) {
    res.status(500).json({ message: "Erreur de vérification." });
  }
};

// ==========================================
// RÉCUPÉRATION INFOS (GET ME)
// ==========================================
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    const userRes = await pool.query(
      'SELECT id, username, email, referral_code, avatar_id, role FROM users WHERE id = $1', 
      [userId]
    );
    
    if (userRes.rows.length === 0) return res.status(404).json({ message: "Utilisateur non trouvé" });

    const user = userRes.rows[0];
    const walletRes = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
    const balance = walletRes.rows.length > 0 ? walletRes.rows[0].balance : 0;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      referral_code: user.referral_code,
      avatar_id: user.avatar_id,
      role: user.role,
      balance: parseFloat(balance)
    });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur Serveur", detail: error.message });
  }
};

// ==========================================
// MOT DE PASSE OUBLIÉ (FORGOT PASSWORD)
// ==========================================
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const userRes = await pool.query('SELECT id, username FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "Aucun compte associé à cet email." });
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await pool.query('UPDATE users SET otp_code = $1 WHERE email = $2', [resetCode, email.toLowerCase().trim()]);

    // OPTIONNEL : Envoyer aussi un mail ici via Hostinger
    await sendVerificationEmail(email.toLowerCase().trim(), userRes.rows[0].username, resetCode);

    res.json({ message: "Un code de récupération a été envoyé à votre email." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la demande." });
  }
};

// ==========================================
// RÉINITIALISATION (RESET PASSWORD)
// ==========================================
export const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1 AND otp_code = $2', [email.toLowerCase().trim(), code]);
    if (userRes.rows.length === 0) return res.status(400).json({ message: "Code invalide ou expiré." });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await pool.query('UPDATE users SET password_hash = $1, otp_code = NULL WHERE email = $2', [hashedPassword, email.toLowerCase().trim()]);
    
    res.json({ message: "Mot de passe réinitialisé avec succès !" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la réinitialisation." });
  }
};

// ==========================================
// MISES À JOUR PROFIL / PASSWORD
// ==========================================
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { username, avatar_id } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Utilisateur non identifié" });
  try {
    if (username) {
      const checkUser = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
      if (checkUser.rows.length > 0) return res.status(400).json({ message: "Ce nom d'utilisateur est déjà utilisé" });
    }
    const updatedUser = await pool.query(
      `UPDATE users SET username = COALESCE($1, username), avatar_id = COALESCE($2, avatar_id) WHERE id = $3 RETURNING id, username, email, avatar_id, role`,
      [username, avatar_id, userId]
    );
    res.json({ message: "Profil mis à jour avec succès", user: updatedUser.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Non autorisé" });
  try {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Le mot de passe actuel est incorrect." });
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHashedPassword, userId]);
    res.json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du mot de passe." });
  }
};