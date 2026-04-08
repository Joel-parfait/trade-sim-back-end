import pool from '../config/db.js';

export const updateSimulatedTrades = async () => {
  try {
    const activeTrades = await pool.query("SELECT * FROM trades WHERE status = 'running'");

    for (const trade of activeTrades.rows) {
      const now = Date.now();
      const start = new Date(trade.start_time).getTime();
      const end = new Date(trade.end_time).getTime();
      const duration = end - start;
      const elapsed = now - start;

      if (elapsed >= duration) {
        // Fin du trade
        await pool.query("UPDATE trades SET current_simulated_price = $1, status = 'completed' WHERE id = $2", [trade.target_profit, trade.id]);
        await pool.query("UPDATE wallets SET balance = balance + $1, total_profit = total_profit + ($1 - $2) WHERE user_id = $3", [trade.target_profit, trade.amount_invested, trade.user_id]);
        console.log(`✅ Trade ${trade.id} terminé pour l'user ${trade.user_id}`);
      } else {
        // Simulation en cours
        const progression = Number(trade.start_price) + (Number(trade.target_profit) - Number(trade.start_price)) * (elapsed / duration);
        const noise = (Math.random() - 0.5) * (Number(trade.amount_invested) * 0.2);
        const newPrice = progression + noise;

        await pool.query("UPDATE trades SET current_simulated_price = $1 WHERE id = $2", [newPrice, trade.id]);
      }
    }
  } catch (error) {
    console.error("Worker Error:", error);
  }
};