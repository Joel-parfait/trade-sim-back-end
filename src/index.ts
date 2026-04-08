import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

// Imports des routes
import authRoutes from './routes/authRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js'; 
import adminRoutes from './routes/adminRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

// Worker
import { updateSimulatedTrades } from './utils/simulationWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["https://ton-nouveau-front.vercel.app", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Route de Santé (Healthcheck)
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'OK', 
      database: 'Connected', 
      serverTime: result.rows[0].now 
    });
  } catch (err) {
    console.error("Healthcheck Error:", err);
    res.status(500).json({ status: 'Error', message: 'DB connection failed' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: "Welcome to TradeSim API - Backend is running!" });
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(`🚀 Serveur CryptoSim opérationnel !`);
  console.log(`🌐 URL : http://localhost:${PORT}`);
  console.log(`📂 Admin API : http://localhost:${PORT}/api/admin`);
  console.log(`=========================================\n`);

  // Lancement du simulateur de trades toutes le 5 secondes
  setInterval(async () => {
    try {
      await updateSimulatedTrades();
    } catch (error) {
      console.error("Simulation Worker Error:", error);
    }
  }, 5000);
});

export default app;