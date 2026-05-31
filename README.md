# ÉCHEC — Chess Reimagined

> Expérience d'échecs en 3D temps réel, avec rendu PBR cinématique, IA embarquée et effets visuels post-traitement.

---

## Aperçu

**ÉCHEC** est une application web de jeu d'échecs full 3D construite avec React Three Fiber. Le plateau et les pièces sont rendus en temps réel avec éclairage physique (PBR), shaders GLSL personnalisés, et une pipeline de post-traitement complète (Bloom, Grain, Vignette). L'adversaire IA est entièrement embarqué dans le navigateur — aucun serveur requis.

---

## Fonctionnalités

### Gameplay
- **Règles complètes** : roque (petit et grand), prise en passant, promotion, pat, répétition triple, règle des 50 coups, matériel insuffisant
- **3 niveaux de difficulté** :
  - *Initié* (ELO ~800) — coups aléatoires, profondeur 1
  - *Maître* (ELO ~1800) — minimax alpha-bêta, profondeur 2
  - *Grand Maître* (ELO ~2800) — minimax + tables de bonus positionnel, profondeur 2
- **Prémove** : planifier un coup pendant que l'IA réfléchit
- **Annuler** : retour en arrière de 2 demi-coups (joueur + IA)
- **Abandonner** : résignation en cours de partie
- **Retourner le plateau** : jouer avec les noirs en vue inversée
- **Horloge** : compte à rebours par joueur, alerte rouge sous 30 secondes

### Interface
- **Menu cinématique** : sélection de la difficulté et de la couleur avant la partie
- **HUD en jeu** :
  - Horloge blanche / noire
  - Pièces capturées avec score matériel
  - Historique des coups en notation SAN (défilant)
  - Indicateur de réflexion IA (animation de points pulsants)
  - Boutons Annuler / Retourner / Abandonner
- **Écran de fin** : résultat avec raison détaillée (mat, pat, timeout, abandon…)
- **Coordonnées** : lettres (a–h) et chiffres (1–8) le long du plateau

### Rendu 3D
- **Modèle GLB** haute fidélité (pièces et plateau en un seul mesh)
- **Éclairage PBR** avec map d'environnement HDR
- **Shaders GLSL** personnalisés pour les cases en marbre
- **Système de particules** ambiant
- **Effets de capture** : animation visuelle à la prise d'une pièce
- **Effet d'échec** : surbrillance du roi en danger
- **Animations de déplacement** : trajectoire en arc parabolique, durée proportionnelle à la distance
- **Post-processing** : Bloom sélectif, grain cinématique, vignette

### Caméra
- Positionnement automatique selon la couleur du joueur (blancs / noirs)
- Transition instantanée au démarrage, bloquée pendant le menu
- Vue alignée sur l'axe du joueur

---

## Stack technique

| Couche | Technologie |
|---|---|
| UI / Framework | React 18 |
| Rendu 3D | Three.js 0.170 + React Three Fiber v8 |
| Helpers 3D | @react-three/drei v9 |
| Post-processing | @react-three/postprocessing + postprocessing v6 |
| État global | Zustand v4 (devtools + subscribeWithSelector) |
| Moteur d'échecs | chess.js v1 |
| Animations | @react-spring/three v9 + maath |
| Shaders | GLSL via vite-plugin-glsl |
| Build | Vite 5 + TypeScript 5 |
| Formatage | Prettier v3 + ESLint v8 |

---

## Architecture

```
src/
├── App.tsx                        # Racine — assemble Scene + UI overlay
├── main.tsx                       # Point d'entrée React
│
├── components/
│   ├── Scene.tsx                  # Canvas R3F, config WebGL, orchestration
│   ├── pieces/
│   │   └── ChessModel.tsx         # Rendu GLB, grille 3D, clic, animations
│   ├── board/
│   │   ├── Board.tsx              # Plateau procédural
│   │   ├── Square.tsx             # Case individuelle
│   │   ├── MarbleSquare.tsx       # Case avec shader marbre
│   │   └── Coordinates.tsx        # Labels a–h / 1–8
│   ├── effects/
│   │   ├── Camera.tsx             # Contrôle caméra cinématique
│   │   ├── Environment.tsx        # Éclairage HDR
│   │   ├── PostProcessing.tsx     # Bloom + Noise + Vignette
│   │   ├── Particles.tsx          # Particules ambiantes
│   │   ├── CaptureEffect.tsx      # Effet visuel de capture
│   │   └── CheckEffect.tsx        # Surbrillance du roi en échec
│   └── ui/
│       ├── Menu.tsx               # Écran d'accueil
│       ├── HUD.tsx                # Interface en jeu
│       └── GameOver.tsx           # Écran de fin
│
├── engine/
│   └── useStockfish.ts            # IA : minimax alpha-bêta + tables positionnelles
│
├── store/
│   └── useGameStore.ts            # État global Zustand (jeu, IA, horloge, animation)
│
├── hooks/
│   └── usePieceAnimation.ts       # Hook d'animation de pièce
│
├── shaders/
│   └── board/
│       ├── marble.vert            # Vertex shader marbre
│       └── marble.frag            # Fragment shader marbre
│
└── types/
    └── index.ts                   # Types partagés (Difficulty, GamePhase, MoveRecord…)
```

---

## Moteur IA

L'IA est un minimax avec élagage alpha-bêta, entièrement côté client :

- **Niveau 1** — profondeur 1, ordre aléatoire des coups
- **Niveau 2** — profondeur 2, captures prioritaires (meilleur élagage)
- **Niveau 3** — profondeur 2 + tables de bonus positionnel (pions, cavaliers)

Fonction d'évaluation statique : somme pondérée des pièces (p=100, n=320, b=330, r=500, q=900) avec bonus positionnel optionnel. Timeout de 1 500 ms pour garantir la fluidité. En cas d'erreur, fallback sur un coup aléatoire valide.

---

## Prérequis

- Node.js ≥ 18
- npm ≥ 9 (ou pnpm / yarn)

---

## Installation

```bash
git clone <url-du-repo>
cd echec
npm install
```

---

## Développement

```bash
npm run dev
```

Ouvre l'application sur `http://localhost:5173`.

> **Note** : le serveur de développement requiert des en-têtes CORS spécifiques (`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`) pour le support des SharedArrayBuffer. Ces en-têtes sont configurés automatiquement dans `vite.config.ts`.

---

## Build de production

```bash
npm run build     # Compile TypeScript + bundle Vite
npm run preview   # Prévisualise le build dans le navigateur
```

---

## Autres commandes

```bash
npm run typecheck   # Vérifie les types TypeScript sans compiler
npm run format      # Formate tout le code source avec Prettier
```

---

## Modèle 3D

Le fichier `public/models/chess_set.glb` contient l'intégralité du plateau et des 32 pièces dans un seul mesh. Les positions des pièces à l'état initial sont lues directement depuis le GLB pour calculer la grille de coordonnées monde (a1→h8), garantissant un alignement pixel-perfect entre la logique chess.js et le rendu Three.js.

---

## Licence

Projet personnel — tous droits réservés.
