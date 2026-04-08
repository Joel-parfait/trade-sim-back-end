import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// --- INTERFACE ÉTENDUE ---
// On ajoute 'role' pour gérer la hiérarchie (user, admin, super_admin)
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'user' | 'admin' | 'super_admin'; // Plus précis que isAdmin: boolean
    isAdmin: boolean; // Gardé pour la compatibilité avec tes anciens scripts
  };
}

/**
 * Middleware de base : Vérifie si l'utilisateur est connecté via un Token JWT valide
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: "Accès refusé. Token manquant." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    // On injecte les données décodées du token dans la requête
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token invalide ou expiré." });
  }
};

/**
 * Middleware Admin : Vérifie si l'utilisateur possède des privilèges (Admin ou Super Admin)
 * À utiliser APRÈS authenticateToken
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Utilisateur non identifié." });
  }

  const role = req.user.role;

  // Autorise si c'est un admin ou un super_admin
  if (role === 'admin' || role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ 
      message: "Accès refusé. Privilèges administrateur requis." 
    });
  }
};

/**
 * Middleware Super Admin : Uniquement pour les actions critiques (tout modifier)
 */
export const isSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ 
      message: "Accès refusé. Niveau Super Administrateur requis." 
    });
  }
};