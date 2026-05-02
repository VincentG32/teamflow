/* ============================================================
   TeamFlow — gestion d'équipe
   HTML / CSS / JS vanilla, persistance localStorage.
   Reproduit les notions Bubble : Sign up, Log in, Log out,
   Current User, Current Page User, rôles, Privacy Rules.
   ============================================================ */

/* ===== 1. DB layer (localStorage wrapper) ===== */
const DB_KEY = 'teamflow.v1';
const SESSION_KEY = 'teamflow.session';
const THEME_KEY = 'teamflow.theme';

const STATUSES = ['todo', 'doing', 'done'];
const STATUS_LABELS = { todo: 'À faire', doing: 'En cours', done: 'Terminée' };

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function loadSession() {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return db.users.find(u => u.id === id) || null;
}

function saveSession(userId) {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
}

/* ===== 2. Seed (données initiales) ===== */
const SEED = {
  users: [
    { id: 'u1', firstName: 'Admin',   email: 'admin@teamflow.test',   password: 'admin', role: 'admin' },
    { id: 'u2', firstName: 'Alice',   email: 'alice@teamflow.test',   password: 'demo',  role: 'user'  },
    { id: 'u3', firstName: 'Bob',     email: 'bob@teamflow.test',     password: 'demo',  role: 'user'  },
  ],
  tasks: [
    { id: 't1', title: 'Préparer la rétro de sprint',     userId: 'u2', status: 'todo',  createdAt: Date.now() - 1000*60*60*24*2 },
    { id: 't2', title: 'Mettre à jour la doc onboarding', userId: 'u2', status: 'done',  createdAt: Date.now() - 1000*60*60*24*1 },
    { id: 't3', title: 'Préparer le démo client',         userId: 'u2', status: 'doing', createdAt: Date.now() - 1000*60*60*8    },
    { id: 't4', title: 'Relire la PR #142',               userId: 'u3', status: 'doing', createdAt: Date.now() - 1000*60*60*5    },
    { id: 't5', title: 'Planifier le 1:1 avec le manager',userId: 'u3', status: 'todo',  createdAt: Date.now() - 1000*60*30      },
    { id: 't6', title: 'Mettre à jour le board Notion',   userId: 'u3', status: 'done',  createdAt: Date.now() - 1000*60*60*24*3 },
  ],
};

let db = loadDB();
if (!db) { db = JSON.parse(JSON.stringify(SEED)); saveDB(); }

/* Migration v1 → v2 : { done: bool } → { status: 'todo'|'doing'|'done' } */
let migrated = false;
db.tasks.forEach(t => {
  if (t.status === undefined) {
    t.status = t.done ? 'done' : 'todo';
    delete t.done;
    migrated = true;
  }
});
if (migrated) saveDB();

/* ===== 3. State (équivalents custom states Bubble) ===== */
const state = {
  currentUser: null,   // ← Current User (Bubble)
  view: 'dashboard',   // 'dashboard' | 'profile' | 'tasks' | 'admin'
  authMode: 'login',   // 'login' | 'signup'
  authError: null,
  profileEditing: false,
  profileError: null,
  mobileMenuOpen: false,                                  // burger menu (≤768px)
  tasksView: 'kanban',                                    // 'list' | 'kanban'
  theme: localStorage.getItem(THEME_KEY) || 'light',      // 'light' | 'dark'
};

state.currentUser = loadSession();
if (!state.currentUser) state.view = 'auth';

/* ===== 4. Helpers ===== */
const $  = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

function getInitials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function formatRelative(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'à l\'instant';
  if (m < 60)  return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

/* ===== 5. Validations ===== */
function validateSignup({ firstName, email, password }) {
  if (!firstName || firstName.trim().length < 2) return 'Le prénom doit contenir au moins 2 caractères.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  return 'Email invalide.';
  if (!password || password.length < 4)            return 'Le mot de passe doit contenir au moins 4 caractères.';
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return 'Cet email est déjà utilisé.';
  return null;
}

function validateLogin({ email, password }) {
  if (!email || !password) return 'Email et mot de passe requis.';
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return 'Email ou mot de passe incorrect.';
  return null;
}

/* ===== 6. Actions auth ===== */
function actionSignup({ firstName, email, password }) {
  const err = validateSignup({ firstName, email, password });
  if (err) { state.authError = err; render(); return; }

  const newUser = {
    id: uid('u'),
    firstName: firstName.trim(),
    email: email.trim(),
    password,
    role: 'user',                 // ← rôle par défaut
  };
  db.users.push(newUser);
  saveDB();

  state.currentUser = newUser;    // ← Current User
  state.authError = null;
  state.view = 'dashboard';
  saveSession(newUser.id);
  toast(`Bienvenue ${newUser.firstName} ! Compte créé.`, 'success');
  render();
}

function actionLogin({ email, password }) {
  const err = validateLogin({ email, password });
  if (err) { state.authError = err; render(); return; }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  state.currentUser = user;       // ← Current User
  state.authError = null;
  state.view = 'dashboard';
  saveSession(user.id);
  toast(`Bienvenue ${user.firstName} !`, 'success');
  render();
}

function actionLogout() {
  state.currentUser = null;
  state.view = 'auth';
  state.authMode = 'login';
  state.mobileMenuOpen = false;
  saveSession(null);
  toast('Déconnexion réussie.');
  render();
}

/* ===== 7. Actions profile ===== */
function actionUpdateProfile({ firstName, email }) {
  const u = state.currentUser;
  if (!u) return;

  if (!firstName || firstName.trim().length < 2) { state.profileError = 'Prénom trop court.'; render(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { state.profileError = 'Email invalide.'; render(); return; }
  const dup = db.users.find(x => x.id !== u.id && x.email.toLowerCase() === email.toLowerCase());
  if (dup) { state.profileError = 'Cet email est déjà utilisé.'; render(); return; }

  u.firstName = firstName.trim();
  u.email = email.trim();
  saveDB();
  state.profileEditing = false;
  state.profileError = null;
  toast('Profil mis à jour.', 'success');
  render();
}

/* ===== 8. Actions tasks ===== */
function actionCreateTask({ title, assignedToId }) {
  if (!state.currentUser) return;
  const t = (title || '').trim();
  if (!t) return;
  // Seul un admin peut assigner une tâche à un autre utilisateur.
  // Pour tous les autres : le champ User = Current User (privacy + Bubble pattern).
  let userId = state.currentUser.id;
  if (state.currentUser.role === 'admin' && assignedToId) {
    userId = assignedToId;
  }
  db.tasks.push({
    id: uid('t'),
    title: t,
    userId,                     // ← This Thing's User = Current User (ou cible si admin)
    status: 'todo',
    createdAt: Date.now(),
  });
  saveDB();
  render();
}

function actionMoveTask(taskId, dir) {
  const t = db.tasks.find(x => x.id === taskId);
  if (!t) return;
  if (state.currentUser.role !== 'admin' && t.userId !== state.currentUser.id) {
    toast('Action interdite.', 'error');
    return;
  }
  const idx = STATUSES.indexOf(t.status);
  const next = dir === 'left' ? idx - 1 : idx + 1;
  if (next < 0 || next >= STATUSES.length) return;
  t.status = STATUSES[next];
  saveDB();
  render();
}

function actionMoveTaskTo(taskId, newStatus) {
  if (!STATUSES.includes(newStatus)) return;
  const t = db.tasks.find(x => x.id === taskId);
  if (!t) return;
  if (state.currentUser.role !== 'admin' && t.userId !== state.currentUser.id) {
    toast('Action interdite.', 'error');
    return;
  }
  if (t.status === newStatus) return;
  t.status = newStatus;
  saveDB();
  render();
}

function actionDeleteTask(taskId) {
  const t = db.tasks.find(x => x.id === taskId);
  if (!t) return;
  if (state.currentUser.role !== 'admin' && t.userId !== state.currentUser.id) {
    toast('Action interdite.', 'error');
    return;
  }
  confirm({
    title: 'Supprimer cette tâche ?',
    subtitle: `« ${t.title} » sera supprimée définitivement.`,
    onConfirm: () => {
      db.tasks = db.tasks.filter(x => x.id !== taskId);
      saveDB();
      toast('Tâche supprimée.');
      render();
    },
  });
}

/* ===== 8b. Actions thème + reset ===== */
function actionToggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, state.theme);
  render();
}

function actionResetData() {
  if (state.currentUser?.role !== 'admin') { toast('Réservé aux admins.', 'error'); return; }
  confirm({
    title: 'Réinitialiser toutes les données ?',
    subtitle: 'Tous les utilisateurs créés et toutes les tâches seront supprimés. Les comptes de démo seront recréés et tu seras déconnecté.',
    onConfirm: () => {
      db = JSON.parse(JSON.stringify(SEED));
      saveDB();
      saveSession(null);
      state.currentUser = null;
      state.view = 'auth';
      state.authMode = 'login';
      state.mobileMenuOpen = false;
      toast('Données réinitialisées.', 'success');
      render();
    },
  });
}

/* ===== 9. UI helpers ===== */
function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'info' ? ' toast-' + type : '');
  el.textContent = message;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function confirm({ title, subtitle, onConfirm }) {
  const dlg = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-subtitle').textContent = subtitle || '';
  const ok = $('#confirm-ok');
  const cancel = $('#confirm-cancel');
  const close = () => { dlg.close(); ok.onclick = null; cancel.onclick = null; };
  ok.onclick = () => { close(); onConfirm(); };
  cancel.onclick = close;
  dlg.showModal();
}

/* ===== 10. Privacy layer (équivalent Privacy Rule Bubble) =====
   Règle : un utilisateur ne voit QUE les tâches dont userId === currentUser.id.
   L'admin voit toutes les tâches (rôle privilégié).
   Cette fonction est l'unique porte d'entrée pour récupérer les tâches.
*/
function getVisibleTasks() {
  if (!state.currentUser) return [];
  if (state.currentUser.role === 'admin') return db.tasks;
  return db.tasks.filter(t => t.userId === state.currentUser.id);
}

/* ===== 11. Views ===== */
function viewAuth() {
  const isLogin = state.authMode === 'login';
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="logo">TF</span>
          <span>TeamFlow</span>
        </div>
        <p class="auth-subtitle">Outil de gestion d'équipe</p>

        <div class="auth-tabs" role="tablist">
          <button class="auth-tab ${isLogin ? 'active' : ''}" data-action="auth-mode" data-mode="login">Connexion</button>
          <button class="auth-tab ${!isLogin ? 'active' : ''}" data-action="auth-mode" data-mode="signup">Inscription</button>
        </div>

        <form data-action="${isLogin ? 'login' : 'signup'}">
          ${!isLogin ? `
            <div class="form-group">
              <label for="firstName">Prénom</label>
              <input id="firstName" name="firstName" type="text" required autocomplete="given-name" placeholder="Alice">
            </div>` : ''}

          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required autocomplete="email" placeholder="alice@teamflow.test">
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input id="password" name="password" type="password" required autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="4">
          </div>

          ${state.authError ? `<div class="field-error" style="margin-bottom: 12px;">${escapeHtml(state.authError)}</div>` : ''}

          <button class="btn btn-primary btn-block" type="submit">
            ${isLogin ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div class="auth-hint">
          <strong>Comptes de démo :</strong>
          <ul class="auth-hint-list">
            <li><span class="auth-hint-role">Admin</span> <code>admin@teamflow.test</code> / <code>admin</code></li>
            <li><span class="auth-hint-role">User</span>&nbsp; <code>alice@teamflow.test</code> / <code>demo</code></li>
            <li><span class="auth-hint-role">User</span>&nbsp; <code>bob@teamflow.test</code>&nbsp;&nbsp; / <code>demo</code></li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function viewDashboard() {
  const u = state.currentUser;
  const myTasks = getVisibleTasks();
  const todo  = myTasks.filter(t => t.status === 'todo').length;
  const doing = myTasks.filter(t => t.status === 'doing').length;
  const done  = myTasks.filter(t => t.status === 'done').length;
  return `
    <div class="page-header">
      <h1>Bienvenue ${escapeHtml(u.firstName)} 👋</h1>
      <p>Voici un aperçu de ton espace TeamFlow.</p>
    </div>

    ${u.role === 'admin' ? `
      <div class="admin-banner">
        <div class="admin-banner-icon">★</div>
        <div class="admin-banner-text">
          <strong>Mode administrateur</strong>
          <small>Tu vois les données de tous les utilisateurs.</small>
        </div>
      </div>
    ` : ''}

    <div class="card">
      <h3 class="card-title">${u.role === 'admin' ? 'Toutes les tâches' : 'Mes tâches'}</h3>
      <div class="dashboard-stats">
        <div class="stat"><strong>${todo}</strong><span>À faire</span></div>
        <div class="stat"><strong>${doing}</strong><span>En cours</span></div>
        <div class="stat"><strong>${done}</strong><span>Terminées</span></div>
      </div>
      <div style="margin-top: 12px;">
        <button class="btn btn-secondary" data-action="goto" data-view="tasks">Ouvrir le kanban →</button>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Mon profil</h3>
      <p class="card-subtitle">Modifie ton prénom ou ton email.</p>
      <button class="btn btn-secondary" data-action="goto" data-view="profile">Aller au profil →</button>
    </div>
  `;
}

function viewProfile() {
  /* "Page Profile" Bubble — affiche/édite Current Page User (= Current User ici). */
  const u = state.currentUser;
  if (state.profileEditing) {
    return `
      <div class="page-header">
        <h1>Mon profil</h1>
        <p>Modifie tes informations personnelles.</p>
      </div>

      <div class="card">
        <form data-action="update-profile">
          <div class="form-group">
            <label for="firstName">Prénom</label>
            <input id="firstName" name="firstName" type="text" required minlength="2" value="${escapeHtml(u.firstName)}">
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required value="${escapeHtml(u.email)}">
          </div>
          ${state.profileError ? `<div class="field-error" style="margin-bottom: 12px;">${escapeHtml(state.profileError)}</div>` : ''}
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" type="submit">Enregistrer</button>
            <button class="btn btn-secondary" type="button" data-action="cancel-profile-edit">Annuler</button>
          </div>
        </form>
      </div>
    `;
  }

  return `
    <div class="page-header">
      <h1>Mon profil</h1>
      <p>Tes informations personnelles.</p>
    </div>

    <div class="card">
      <div class="profile-header">
        <div class="avatar-lg">${getInitials(u.firstName)}</div>
        <div class="profile-meta">
          <h2>${escapeHtml(u.firstName)}</h2>
          <p>${escapeHtml(u.email)}</p>
          <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>
        </div>
      </div>

      <dl class="profile-grid">
        <dt>Prénom</dt><dd>${escapeHtml(u.firstName)}</dd>
        <dt>Email</dt><dd>${escapeHtml(u.email)}</dd>
        <dt>Rôle</dt><dd>${escapeHtml(u.role)}</dd>
        ${u.role === 'admin' ? `<dt>Identifiant <small style="color:var(--muted);font-weight:400">(admin)</small></dt><dd><code>${escapeHtml(u.id)}</code></dd>` : ''}
      </dl>

      <button class="btn btn-primary" data-action="edit-profile">Modifier mes informations</button>
    </div>
  `;
}

function viewTasks() {
  const u = state.currentUser;
  const tasks = getVisibleTasks();
  const isAdmin = u.role === 'admin';

  const assignSelect = isAdmin ? `
    <select name="assignedToId" title="Assigner à">
      <option value="">— Pour moi —</option>
      ${db.users.map(x => `<option value="${x.id}">${escapeHtml(x.firstName)}</option>`).join('')}
    </select>
  ` : '';

  return `
    <div class="page-header">
      <h1>${isAdmin ? 'Toutes les tâches' : 'Mes tâches'}</h1>
      <p>${isAdmin
        ? 'En tant qu\'admin, tu vois (et peux assigner) les tâches de toute l\'équipe.'
        : 'Tu ne vois que tes propres tâches (privacy rule).'}
      </p>
    </div>

    <div class="card">
      <form class="task-form" data-action="create-task">
        <input name="title" type="text" placeholder="Nouvelle tâche…" required>
        ${assignSelect}
        <button class="btn btn-primary" type="submit">Ajouter</button>
      </form>

      <div class="view-toggle">
        <button class="view-toggle-btn ${state.tasksView === 'kanban' ? 'active' : ''}" data-action="set-tasks-view" data-view="kanban">📋 Kanban</button>
        <button class="view-toggle-btn ${state.tasksView === 'list' ? 'active' : ''}"   data-action="set-tasks-view" data-view="list">≡ Liste</button>
      </div>

      ${tasks.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-title">Aucune tâche pour le moment</div>
          <div>Crée ta première tâche ci-dessus.</div>
        </div>
      ` : (state.tasksView === 'kanban' ? renderKanban(tasks, isAdmin) : renderList(tasks, isAdmin))}
    </div>
  `;
}

function renderKanban(tasks, isAdmin) {
  return `
    <div class="kanban">
      ${STATUSES.map(s => {
        const colTasks = tasks.filter(t => t.status === s).sort((a, b) => b.createdAt - a.createdAt);
        return `
          <div class="kanban-col" data-status="${s}">
            <div class="kanban-col-header">
              <span>${STATUS_LABELS[s]}</span>
              <span class="kanban-count">${colTasks.length}</span>
            </div>
            <div class="kanban-cards">
              ${colTasks.map(t => kanbanCard(t, isAdmin)).join('') || '<div class="kanban-empty">Vide</div>'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function kanbanCard(t, isAdmin) {
  const owner = db.users.find(x => x.id === t.userId);
  const idx = STATUSES.indexOf(t.status);
  const canLeft  = idx > 0;
  const canRight = idx < STATUSES.length - 1;
  return `
    <div class="kanban-card status-${t.status}" draggable="true" data-task-id="${t.id}">
      <div class="kanban-card-title">${escapeHtml(t.title)}</div>
      <div class="kanban-card-meta">
        <span>${formatRelative(t.createdAt)}</span>
        ${isAdmin && owner ? `<span class="kanban-card-owner">${escapeHtml(owner.firstName)}</span>` : ''}
      </div>
      <div class="kanban-card-actions">
        <button class="btn-icon move-arrow" data-action="move-task" data-id="${t.id}" data-dir="left"  ${canLeft  ? '' : 'disabled'} title="Reculer">←</button>
        <button class="btn-icon move-arrow" data-action="move-task" data-id="${t.id}" data-dir="right" ${canRight ? '' : 'disabled'} title="Avancer">→</button>
        <button class="btn-icon btn-icon-danger" data-action="delete-task" data-id="${t.id}" title="Supprimer">×</button>
      </div>
    </div>
  `;
}

function renderList(tasks, isAdmin) {
  const sorted = tasks.slice().sort((a, b) => b.createdAt - a.createdAt);
  return `
    <div class="task-list">
      ${sorted.map(t => {
        const owner = db.users.find(x => x.id === t.userId);
        const idx = STATUSES.indexOf(t.status);
        return `
          <div class="task-item status-${t.status}">
            <div class="task-main">
              <div class="task-title">${escapeHtml(t.title)}</div>
              <div class="task-meta">
                <span class="badge badge-status-${t.status}">${STATUS_LABELS[t.status]}</span>
                <span>${formatRelative(t.createdAt)}</span>
                ${isAdmin && owner ? `<span>· ${escapeHtml(owner.firstName)}</span>` : ''}
              </div>
            </div>
            <div class="task-actions">
              <button class="btn-icon" data-action="move-task" data-id="${t.id}" data-dir="left"  ${idx > 0 ? '' : 'disabled'} title="Reculer">←</button>
              <button class="btn-icon" data-action="move-task" data-id="${t.id}" data-dir="right" ${idx < STATUSES.length - 1 ? '' : 'disabled'} title="Avancer">→</button>
              <button class="btn btn-ghost" data-action="delete-task" data-id="${t.id}">Supprimer</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function viewAdmin() {
  /* Vue admin-only — protégée à la fois côté UI (rôle) et côté logique (render). */
  const users = db.users;
  return `
    <div class="page-header">
      <h1>Espace administrateur</h1>
      <p>Liste de tous les utilisateurs et de leurs tâches.</p>
    </div>

    <div class="admin-banner">
      <div class="admin-banner-icon">★</div>
      <div class="admin-banner-text">
        <strong>Vue privilégiée</strong>
        <small>Cette page est visible uniquement pour les utilisateurs avec le rôle « admin ».</small>
      </div>
    </div>

    <table class="users-table">
      <thead>
        <tr>
          <th>Utilisateur</th>
          <th>Email</th>
          <th>Rôle</th>
          <th>Tâches</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => {
          const count = db.tasks.filter(t => t.userId === u.id).length;
          return `
            <tr>
              <td data-label="Utilisateur"><strong>${escapeHtml(u.firstName)}</strong></td>
              <td data-label="Email">${escapeHtml(u.email)}</td>
              <td data-label="Rôle"><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
              <td data-label="Tâches">${count}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="card admin-danger-zone">
      <h3 class="card-title">Zone de danger</h3>
      <p class="card-subtitle">Réinitialise complètement les données (utilisateurs + tâches) avec les comptes de démo. Pratique pour repartir d'un état propre avant une démonstration.</p>
      <button class="btn btn-danger" data-action="reset-data">🔄 Réinitialiser toutes les données</button>
    </div>
  `;
}

/* ===== 12. Nav ===== */
function viewNav() {
  const u = state.currentUser;
  const isAdmin = u.role === 'admin';
  const tabs = [
    ['dashboard', 'Accueil'],
    ['tasks',     'Tâches'],
    ['profile',   'Profil'],
    ...(isAdmin ? [['admin', 'Admin']] : []),
  ];
  const tabsHtml = tabs.map(([v, label]) => `
    <button class="nav-tab ${state.view === v ? 'active' : ''}" data-action="goto" data-view="${v}">${label}</button>
  `).join('');

  return `
    <nav class="nav">
      <div class="nav-brand">
        <span class="logo">TF</span>
        <span>TeamFlow</span>
      </div>

      <div class="nav-tabs nav-tabs-desktop">
        ${tabsHtml}
      </div>

      <div class="nav-user">
        <button class="btn btn-ghost theme-toggle" data-action="toggle-theme" title="Changer le thème" aria-label="Changer le thème">${state.theme === 'dark' ? '☀️' : '🌙'}</button>
        <div class="user-info">
          <span class="user-name">${escapeHtml(u.firstName)}</span>
          <span class="user-role">${escapeHtml(u.role)}</span>
        </div>
        <div class="avatar">${getInitials(u.firstName)}</div>
        <button class="btn btn-ghost nav-logout-desktop" data-action="logout">Déconnexion</button>
      </div>

      <button class="nav-burger" data-action="toggle-menu" aria-label="Ouvrir le menu" aria-expanded="${state.mobileMenuOpen}">
        ${state.mobileMenuOpen ? '✕' : '☰'}
      </button>
    </nav>

    ${state.mobileMenuOpen ? `
      <div class="nav-mobile-overlay" data-action="close-menu"></div>
      <div class="nav-mobile-panel" role="menu">
        <div class="nav-mobile-header">
          <div class="nav-mobile-user">
            <div class="avatar">${getInitials(u.firstName)}</div>
            <div>
              <div class="user-name">${escapeHtml(u.firstName)}</div>
              <div class="user-role">${escapeHtml(u.role)}</div>
            </div>
          </div>
          <button class="btn btn-ghost theme-toggle" data-action="toggle-theme" aria-label="Changer le thème">${state.theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}</button>
        </div>
        <div class="nav-mobile-tabs">
          ${tabsHtml}
        </div>
        <button class="nav-mobile-logout" data-action="logout">Déconnexion</button>
      </div>
    ` : ''}
  `;
}

/* ===== 13. Debug panel ===== */
function viewDebug() {
  const snapshot = {
    currentUser: state.currentUser ? {
      id: state.currentUser.id,
      firstName: state.currentUser.firstName,
      email: state.currentUser.email,
      role: state.currentUser.role,
    } : null,
    'Current User is logged in': !!state.currentUser,
    view: state.view,
    tasksView: state.tasksView,
    theme: state.theme,
    visibleTasksCount: getVisibleTasks().length,
    totalTasksCount: db.tasks.length,
  };
  return `
    <details class="debug-panel">
      <summary>🔍 État (panneau debug — utile pour relier au modèle Bubble)</summary>
      <pre>${escapeHtml(JSON.stringify(snapshot, null, 2))}</pre>
    </details>
  `;
}

/* ===== 14. Render (dispatcher) ===== */
function render() {
  const root = $('#app');

  /* Application du thème (light / dark) sur l'élément racine */
  document.documentElement.dataset.theme = state.theme;

  /* Pas de session → écran auth (Sign up / Log in) */
  if (!state.currentUser) {
    state.view = 'auth';
    root.innerHTML = viewAuth();
    return;
  }

  /* Garde-fou : si non-admin tente d'accéder à la vue admin → renvoi accueil */
  if (state.view === 'admin' && state.currentUser.role !== 'admin') {
    state.view = 'dashboard';
  }

  let main = '';
  switch (state.view) {
    case 'profile': main = viewProfile(); break;
    case 'tasks':   main = viewTasks();   break;
    case 'admin':   main = viewAdmin();   break;
    default:        main = viewDashboard();
  }

  root.innerHTML = `
    <div class="app-shell">
      ${viewNav()}
      <main class="main">
        ${main}
        ${viewDebug()}
      </main>
    </div>
  `;
}

/* ===== 15. Event binding ===== */
function readForm(form) {
  const data = {};
  for (const el of form.elements) {
    if (el.name) data[el.name] = el.value;
  }
  return data;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'auth-mode') {
    state.authMode = btn.dataset.mode;
    state.authError = null;
    render();
    return;
  }
  if (action === 'goto') {
    state.view = btn.dataset.view;
    state.profileEditing = false;
    state.mobileMenuOpen = false;
    render();
    return;
  }
  if (action === 'toggle-menu') { state.mobileMenuOpen = !state.mobileMenuOpen; render(); return; }
  if (action === 'close-menu')  { state.mobileMenuOpen = false; render(); return; }
  if (action === 'toggle-theme'){ actionToggleTheme(); return; }
  if (action === 'set-tasks-view') { state.tasksView = btn.dataset.view; render(); return; }
  if (action === 'move-task')   { actionMoveTask(btn.dataset.id, btn.dataset.dir); return; }
  if (action === 'reset-data')  { actionResetData(); return; }
  if (action === 'logout')             { actionLogout(); return; }
  if (action === 'edit-profile')       { state.profileEditing = true; state.profileError = null; render(); return; }
  if (action === 'cancel-profile-edit'){ state.profileEditing = false; state.profileError = null; render(); return; }
  if (action === 'delete-task')        { actionDeleteTask(btn.dataset.id); return; }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-action]');
  if (!form) return;
  e.preventDefault();
  const action = form.dataset.action;
  const data = readForm(form);

  if (action === 'login')          actionLogin(data);
  else if (action === 'signup')    actionSignup(data);
  else if (action === 'update-profile') actionUpdateProfile(data);
  else if (action === 'create-task') {
    actionCreateTask(data);
    form.reset();
  }
});

/* ===== 15b. Drag & Drop (desktop kanban) =====
   API HTML5 native — ne s'active qu'à la souris, donc le mobile garde
   les flèches ← → automatiquement (les events drag* ne sont pas émis
   par le touch sans polyfill). */
let draggedTaskId = null;

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.kanban-card[draggable="true"]');
  if (!card) return;
  draggedTaskId = card.dataset.taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTaskId);
  card.classList.add('dragging');
});

document.addEventListener('dragend', (e) => {
  const card = e.target.closest('.kanban-card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.kanban-col.drag-over').forEach(c => c.classList.remove('drag-over'));
  draggedTaskId = null;
});

document.addEventListener('dragover', (e) => {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});

document.addEventListener('dragenter', (e) => {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  col.classList.add('drag-over');
});

document.addEventListener('dragleave', (e) => {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  // dragleave fire aussi en entrant dans un enfant — on ne nettoie que si on quitte vraiment la colonne
  if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
});

document.addEventListener('drop', (e) => {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  e.preventDefault();
  const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
  const newStatus = col.dataset.status;
  col.classList.remove('drag-over');
  if (taskId && newStatus) actionMoveTaskTo(taskId, newStatus);
});

/* ===== 16. Init ===== */
render();
