# Démasq

Jeu social d’imposteurs en français pour 3 à 12 joueurs, sur un téléphone partagé ou dans un salon en ligne.

## Fonctionnalités actuelles

- Distribution secrète avec portrait, deux modes (identité différente ou imposteur sans personnage), indices oraux et votes secrets sans minuteur.
- Scores cumulés, classement, rotations des rôles, historique et reprise locale.
- Salons invités : code de partage, préparation des joueurs, chat, reconnexion et transfert de l’hôte. Synchronisation HTTP périodique et stockage D1.
- 76 identités conservées dans le catalogue. 25 images contrôlées, dont 24 jouables en paires compatibles. Sherlock Holmes reste hors sélection en attendant un partenaire illustré. Les 51 identités sans image validée sont exclues du tirage.
- Images WebP locales, crédits et liens de licence dans chaque carte. La confirmation de consultation attend le décodage du portrait.

L’audit complet et les sources sont dans [docs/IMAGE-AUDIT.md](docs/IMAGE-AUDIT.md) et `docs/image-evidence/`. Les droits des images sont ceux de leurs licences respectives ; aucune licence globale sur ces images n’est implicite.

## Installation et développement

Node.js >= 22.13 et npm sont nécessaires.

```sh
npm ci
npm run dev
```

Le serveur local écoute sur http://localhost:5173. Pour les salons, construire puis initialiser la base D1 locale :

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_perpetual_havok.sql
```

Ne pas réappliquer cette migration sur une base déjà initialisée. `.env.example` décrit la configuration ; aucun secret applicatif n’est requis pour le développement actuel. La liaison `DB` est déclarée dans `.openai/hosting.json`. Les instructions techniques du socle sont conservées dans [docs/STARTER.md](docs/STARTER.md).

## Vérifications

```sh
npm test
npm run typecheck
npm run lint
npm run build
node scripts/smoke-online.mjs
```

Le dernier contrôle nécessite le serveur de développement et la base locale initialisée. Il crée trois invités isolés et vérifie une manche, les scores, la reconnexion et le transfert de l’hôte.

## Architecture et limites

React, TypeScript, Vinext/Vite et Worker Cloudflare ; Drizzle/D1 pour les salons. Le serveur filtre les secrets par joueur, vérifie les actions de l’hôte et les votes, et applique une limitation de requêtes. L’identité invitée repose sur un cookie HttpOnly ; les modifications concurrentes utilisent une révision optimiste.

Les sessions locales dépendent du stockage du navigateur. Les comptes, amis, notifications et installation PWA hors ligne ne sont pas encore implémentés. Le dépôt contient le projet ; sa publication sur GitHub ne constitue pas un déploiement du service en ligne.
