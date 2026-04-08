import pool from './config/db.js';

const cleanupUnverifiedAccounts = async () => {
  try {
    const result = await pool.query(`
      DELETE FROM users 
      WHERE is_verified = FALSE 
      AND created_at < NOW() - INTERVAL '24 hours'
    `);
    if (result.rowCount > 0) {
      console.log(`🧹 Nettoyage : ${result.rowCount} comptes non vérifiés supprimés.`);
    }
  } catch (error) {
    console.error("Erreur lors du nettoyage des comptes :", error);
  }
};

// Exécuter le nettoyage toutes les 6 heures
setInterval(cleanupUnverifiedAccounts, 6 * 60 * 60 * 1000);