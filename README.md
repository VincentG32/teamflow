# 👥 TeamFlow

> Outil de gestion d'équipe — application web 100 % statique, sans backend ni dépendance.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-fonctionnelle-success)
![Stack](https://img.shields.io/badge/stack-vanilla%20JS-yellow)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

**TeamFlow** est une application complète de gestion d'équipe construite en pur **HTML / CSS / JavaScript vanilla**. Elle gère l'authentification, un profil utilisateur modifiable, des rôles (user / admin), des tâches personnelles et applique une **règle de confidentialité (privacy rule)** côté code : un utilisateur ne voit que ses propres tâches, l'admin voit celles de tout le monde.

---

## 📑 Sommaire

- [Contexte](#-contexte)
- [Fonctionnalités](#-fonctionnalités)
- [Démarrage rapide](#-démarrage-rapide)
- [Stack technique](#%EF%B8%8F-stack-technique)
- [Structure du projet](#-structure-du-projet)
- [Architecture](#%EF%B8%8F-architecture)
- [Comptes de démo](#-comptes-de-démo)
- [Mapping pédagogique (énoncé Bubble → code)](#-mapping-pédagogique-énoncé-bubble--code)
- [Tester la privacy rule](#-tester-la-privacy-rule)
- [Limites connues](#%EF%B8%8F-limites-connues)
- [Licence](#-licence)

---

## 📖 Contexte

Ce projet a été développé dans le cadre d'une formation IA à **[La Capsule](https://www.lacapsule.academy/)**.

L'énoncé original demandait de réaliser l'application sur **Bubble** (no-code) pour couvrir les notions suivantes :

- Gérer l'inscription et la connexion (Sign up / Log in / Log out)
- Utiliser **Current User** pour personnaliser l'interface
- Créer une page **Profile** (Current Page User)
- Gérer des rôles (admin vs user)
- Sécuriser l'accès aux données via une **Privacy Rule**

L'application a été réimplémentée **en code** pour dépasser le cadre de l'exercice tout en conservant l'intégralité de la logique pédagogique (voir [mapping](#-mapping-pédagogique-énoncé-bubble--code)).

---

## ✨ Fonctionnalités

| Domaine | Détail |
|---|---|
| 🔐 **Authentification** | Sign up, Log in, Log out — session persistée, comptes pré-seedés |
| 👤 **Profil** | Page Profile avec avatar, prénom, email, rôle, identifiant — édition possible |
| 🛡️ **Rôles** | Champ `role` avec valeur par défaut `user` ; rôle `admin` débloque l'onglet Admin |
| ✅ **Tâches** | Création, complétion, suppression — chaque tâche appartient à un utilisateur |
| 🔒 **Privacy rule** | Filtrage côté code dans `getVisibleTasks()` : un user ne voit que ses tâches |
| 🛠 **Espace administrateur** | Vue de tous les utilisateurs et de leurs tâches (rôle admin uniquement) |
| 🪪 **Personnalisation** | « Bienvenue *prénom* » sur l'accueil (équivalent `Current User's first name`) |
| 💾 **Persistance** | Tout en `localStorage` (utilisateurs, tâches, session) |
| 🐛 **Panneau debug** | Visualise en direct `Current User`, `Current User is logged in`, vue active, nombre de tâches visibles vs total |

---

## 🚀 Démarrage rapide

### Cloner et ouvrir directement

```bash
git clone https://github.com/VincentG32/teamflow.git
cd teamflow
open index.html
```

### Ou servir avec un mini-serveur (recommandé)

```bash
# Python (déjà installé sur macOS)
python3 -m http.server 8000

# ou Node
npx serve

# puis : http://localhost:8000
```

### Déployer

Aucun build, aucune config — déployable tel quel sur n'importe quel hébergeur statique :

- **GitHub Pages** : Settings → Pages → branch `main` / root
- **Netlify Drop** : drag & drop du dossier sur [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel** : `npx vercel`

---

## 🛠️ Stack technique

- **HTML5** — un seul fichier `index.html` qui sert de squelette
- **CSS3** — design system avec variables CSS, sans framework
- **JavaScript vanilla (ES2022)** — pas de bundler, pas de dépendance, pas de transpileur
- **localStorage** — couche de persistance unique
- **`<dialog>` natif** — pour la modale de confirmation

> Aucun `package.json`, aucun `node_modules`. Le projet fonctionne en ouvrant `index.html` dans un navigateur moderne.

---

## 📂 Structure du projet

```
teamflow/
├── index.html      # Squelette + dialogue de confirmation + container toast
├── styles.css      # Design system complet
├── app.js          # Toute la logique (16 sections numérotées)
├── LICENSE
├── .gitignore
└── README.md
```

### Organisation interne de `app.js`

Le fichier est segmenté en blocs numérotés :

```
1.  DB layer (localStorage wrapper)
2.  Seed (utilisateurs admin/Alice/Bob + tâches de démo)
3.  State (currentUser, view, authMode…)
4.  Helpers (escapeHtml, getInitials, formatRelative, uid)
5.  Validations (signup, login)
6.  Actions auth (Sign up / Log in / Log out)
7.  Actions profile (update)
8.  Actions tasks (create / toggle / delete)
9.  UI helpers (toast, confirm)
10. Privacy layer (getVisibleTasks ← équivalent Privacy Rule)
11. Views (auth, dashboard, profile, tasks, admin)
12. Nav (barre supérieure)
13. Debug panel
14. Render (dispatcher)
15. Event binding (delegation click + submit)
16. Init
```

---

## 🏗️ Architecture

### Modèle de données

```
User { id, firstName, email, password, role: 'user' | 'admin' }
Task { id, title, userId, done, createdAt }
```

Le champ `userId` sur `Task` est l'équivalent du champ **User** de type **User** côté Bubble. Il est renseigné automatiquement avec `Current User` lors de la création.

### Flux de rendu

```
              ┌─────────────────────────────┐
              │  state (mémoire)            │
              │  + db (localStorage)        │
              └──────────────┬──────────────┘
                             │ render()
                             ▼
              ┌─────────────────────────────┐
              │  innerHTML du <div id=app>  │
              │  (template strings)         │
              └──────────────┬──────────────┘
                             │ event delegation
                             ▼
              ┌─────────────────────────────┐
              │  handleAction(e)            │
              │  → mute le state            │
              │  → saveDB() si nécessaire   │
              │  → render()                 │
              └─────────────────────────────┘
```

### Principes

- **Single source of truth** : tout l'état UI dans `state`, toutes les données dans `db`.
- **Re-render complet** sur chaque action — simple et suffisant à cette échelle.
- **Event delegation** : un seul listener `click` et un seul `submit` sur `document`, dispatchés via les attributs `data-action`.
- **Privacy rule centralisée** : tous les accès à `db.tasks` passent par `getVisibleTasks()`, qui applique le filtrage selon `Current User`.

---

## 🔐 Comptes de démo

L'app crée trois comptes au premier lancement (les trois sont aussi affichés directement sur l'écran de connexion) :

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@teamflow.test` | `admin` |
| User | `alice@teamflow.test` | `demo` |
| User | `bob@teamflow.test` | `demo` |

> Note : les mots de passe sont stockés en clair dans `localStorage`. Ce projet est un exercice — **ne pas l'utiliser en production sans backend, hashage et HTTPS**.

---

## 📚 Mapping pédagogique (énoncé Bubble → code)

| Notion Bubble (énoncé La Capsule) | Implémentation dans le code |
|---|---|
| Action **Sign up** | `actionSignup()` — section 6 |
| Action **Log in** | `actionLogin()` — section 6 |
| Action **Log out** | `actionLogout()` — section 6 |
| **Current User** | `state.currentUser` — section 3 |
| **Current User's first name** (« Bienvenue *prénom* ») | `${escapeHtml(u.firstName)}` dans `viewDashboard()` |
| **Current User is logged in** | `if (state.currentUser)` dans `render()` + condition de la nav |
| Page **Profile** + **Current Page User** | `viewProfile()` qui lit `state.currentUser` |
| Modification du profil | `actionUpdateProfile()` — section 7 |
| Champ **role** (default `user`) | Ligne `role: 'user'` dans `actionSignup()` |
| Élément visible **uniquement pour les admins** | `${isAdmin ? '<button…Admin</button>' : ''}` dans `viewNav()` + bannière dans `viewDashboard()` |
| Type **Ticket / Tâche** avec champ **User** de type **User** | Modèle `Task { …, userId, … }` |
| Champ **User** renseigné avec **Current User** à la création | `userId: state.currentUser.id` dans `actionCreateTask()` |
| **Privacy Rule** « *This Thing's User is Current User* » | `getVisibleTasks()` — section 10 |

---

## 🧪 Tester la privacy rule

Pour vérifier que la règle de confidentialité fonctionne :

1. **Connecte-toi en Alice** (`alice@teamflow.test` / `demo`) → onglet **Tâches** : tu vois 2 tâches (les siennes).
2. **Déconnecte-toi**, **connecte-toi en Bob** (`bob@teamflow.test` / `demo`) → tu vois 2 tâches **différentes** (les siennes).
3. **Déconnecte-toi**, **connecte-toi en Admin** (`admin@teamflow.test` / `admin`) → tu vois **les 4 tâches** + un onglet **Admin** avec le décompte par utilisateur.
4. Le **panneau debug** en bas de page affiche `visibleTasksCount` vs `totalTasksCount` pour confirmer le filtrage.

---

## 📝 Changelog

### v2 — 2 mai 2026
- **Refonte responsive** : 2 breakpoints (768 / 480 px) pensés pour mobile portrait.
- **Burger menu** ☰ sur mobile : remplace les 4 onglets cramés par un panneau déroulant avec en-tête utilisateur et bouton Déconnexion intégré (overlay sombre + animation).
- **Table admin → cards** sur mobile : chaque utilisateur dans sa propre carte avec libellés inline (`data-label` + `::before`), beaucoup plus lisible en portrait.
- **Écran de connexion enrichi** : les 3 comptes de démo (Admin, Alice, Bob) sont listés en bas de la carte, prêts à copier-coller.
- **Polish mobile** : header de profil empilé vertical, modale plein-largeur, formulaire de tâche en colonne, anti-zoom iOS (`font-size: 16px` + `min-height: 44px` sur les boutons).

### v1 — 2 mai 2026
- Première mise en ligne avec auth (Sign up / Log in / Log out), Current User, page Profile, gestion des rôles, privacy rule sur les tâches, et persistance localStorage.
- Déploiement sur GitHub Pages.

---

## ⚠️ Limites connues

- **`localStorage` est par-navigateur, par-appareil** : si l'app est déployée publiquement, chaque visiteur a sa propre BDD isolée. La privacy rule est donc démontrée *au sein d'un même navigateur* (en switchant de compte). Pour du vrai multi-utilisateurs partagé, il faudrait un backend (ex: Supabase, Firebase) qui appliquerait la règle côté serveur.
- **Pas de hashage de mot de passe** : OK pour un exercice, à ne **pas** déployer tel quel en production.
- **Pas de tests automatisés** : le projet est volontairement minimal.
- **Réinitialisation des données** : vider le localStorage du domaine (DevTools → Application → Local Storage → Clear) puis recharger.

---

## 📜 Licence

[MIT](LICENSE) © 2026 Vincent Granouillit

---

<sub>Construit avec ❤️ et beaucoup de `Current User`.</sub>
