import { Router } from 'express';
import { 
  getAllUsers, 
  getAllTrades, 
  updateUserBalance, 
  updateUserStatus,
  updateUserRole, // <--- AJOUTÉ
  deleteUser
} from '../controllers/adminController.js';
import { authenticateToken, isAdmin, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Toutes les routes ci-dessous nécessitent d'être connecté
router.use(authenticateToken);

// --- ROUTES ACCESSIBLES AUX ADMINS ET SUPER_ADMINS ---
// (Les contrôleurs filtrent déjà les données pour les admins standards)
router.get('/users', isAdmin, getAllUsers);
router.get('/trades', isAdmin, getAllTrades);
router.put('/users/balance', isAdmin, updateUserBalance);
router.put('/users/status', isAdmin, updateUserStatus);
router.delete('/users/:targetUserId', isAdmin, deleteUser);

// --- ROUTES EXCLUSIVES AU SUPER_ADMIN ---
// Seul le Super Admin peut changer le rôle (promouvoir un admin)
router.put('/users/role', isSuperAdmin, updateUserRole);

export default router;