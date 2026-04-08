# 🚀 TradeSim API - Backend

Système de simulation de trading de cryptomonnaies avec robots automatisés.

## 🛠 Stack Technique
- **Runtime**: Node.js (v20+)
- **Langage**: TypeScript (ESM)
- **Framework**: Express.js
- **Base de données**: PostgreSQL
- **Authentification**: JWT (JSON Web Tokens) & Bcrypt

## ⚙️ Installation
1. `cd backend`
2. `npm install`
3. Configurer le fichier `.env` (voir `.env.example`)
4. `npm run dev`

## 📡 Endpoints Principaux

### Authentification
- `POST /api/auth/register` : Inscription (email, password, referralCode)
- `POST /api/auth/login` : Connexion (retourne un Token JWT)
- `GET /api/auth/me` : Profil utilisateur (Protégé)

### Trading
- `POST /api/trades/start` : Lancer un robot (amount, crypto_symbol)
- `GET /api/trades/active` : Voir les robots en cours
- `GET /api/trades/history` : Historique des trades terminés

### Portefeuille
- `GET /api/wallet/balance` : Consulter son solde

## 🤖 Moteur de Simulation
Le moteur met à jour les prix toutes les 5 secondes via un Worker asynchrone qui calcule la progression linéaire + bruit aléatoire.