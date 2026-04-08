import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Création du transporteur avec tes paramètres Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envoie le mail de vérification OTP uniquement à l'utilisateur concerné
 */
export const sendVerificationEmail = async (userEmail: string, username: string, otp: string) => {
  const mailOptions = {
    // "from" utilise ton adresse Hostinger et le nom d'affichage souhaité
    from: `"TradeSim" <${process.env.EMAIL_USER}>`,
    to: userEmail, // Uniquement le destinataire qui initie la requête
    subject: "Code de vérification - CryptoSim Inscription",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0b0e11; color: #ffffff; padding: 30px; border-radius: 15px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #3b82f6;">Vérification de compte</h2>
        </div>
        <p>Bonjour <strong>${username}</strong>,</p>
        <p>Votre inscription est presque terminée. Voici votre code de sécurité :</p>
        <div style="background-color: #121418; padding: 20px; text-align: center; border-radius: 10px; border: 2px solid #3b82f6; margin: 20px 0;">
          <span style="font-size: 35px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${otp}</span>
        </div>
        <p style="font-size: 11px; color: #666; text-align: center;">Ce code est strictement confidentiel. Ne le partagez jamais.</p>
        <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 10px; text-align: center; font-size: 10px; color: #aaa;">
          © 2026 CryptoSim - Institutional Grade Security
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};