// =========================================================
// CONFIGURATION SUPABASE & INITIALISATION EMRIS
// =========================================================

// Remplacez par vos identifiants Supabase (Project URL et Anon Key)
const SUPABASE_URL = 'VOTRE_SUPABASE_PROJECT_URL'; 
const SUPABASE_ANON_KEY = 'VOTRE_SUPABASE_ANON_KEY';

// Initialisation du client Supabase global
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // Éléments de l'interface
  const chatSection = document.getElementById('chatSection');
  const adminSection = document.getElementById('adminSection');
  const btnOpenAdmin = document.getElementById('btnOpenAdmin');
  const btnBackToChat = document.getElementById('btnBackToChat');
  const adminAuthModal = document.getElementById('adminAuthModal');
  const btnCloseAdminAuthModal = document.getElementById('btnCloseAdminAuthModal');
  const adminAuthForm = document.getElementById('adminAuthForm');
  const adminPasscode = document.getElementById('adminPasscode');
  const adminAuthError = document.getElementById('adminAuthError');

  // Gestion des vues (Chat <-> Admin)
  btnOpenAdmin.addEventListener('click', () => {
    adminAuthModal.classList.add('active');
  });

  btnCloseAdminAuthModal.addEventListener('click', () => {
    adminAuthModal.classList.remove('active');
  });

  adminAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const passcode = adminPasscode.value.trim();
    if (passcode === 'admin2026' || passcode === 'emris2026') {
      adminAuthModal.classList.remove('active');
      adminAuthError.classList.add('hidden');
      adminPasscode.value = '';
      chatSection.classList.remove('active');
      adminSection.classList.add('active');
      loadAdminUsersFromSupabase();
    } else {
      adminAuthError.textContent = "Code d'accès administrateur incorrect.";
      adminAuthError.classList.remove('hidden');
    }
  });

  btnBackToChat.addEventListener('click', () => {
    adminSection.classList.remove('active');
    chatSection.classList.add('active');
  });

  // Gestion du Modal d'Inscription / Connexion Client
  const authModal = document.getElementById('authModal');
  const btnUserAccount = document.getElementById('btnUserAccount');
  const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
  const tabRegister = document.getElementById('tabRegister');
  const tabLogin = document.getElementById('tabLogin');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const authModalTitle = document.getElementById('authModalTitle');

  if (btnUserAccount) {
    btnUserAccount.addEventListener('click', () => authModal.classList.add('active'));
    btnCloseAuthModal.addEventListener('click', () => authModal.classList.remove('active'));
  }

  if (tabRegister && tabLogin) {
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
      authModalTitle.textContent = "Inscription Rapide Emris";
    });

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      authModalTitle.textContent = "Connexion Espace Client";
    });
  }

  // ENREGISTREMENT D'UN NOUVEL UTILISATEUR DANS SUPABASE
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nom = document.getElementById('regNom').value.trim();
      const telephone = document.getElementById('regTelephone').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const mot_de_passe = document.getElementById('regPassword').value.trim();
      const errorBox = document.getElementById('registerErrorMsg');

      try {
        const { data, error } = await db
          .from('utilisateurs')
          .insert([
            {
              nom: nom,
              telephone: telephone,
              email: email,
              mot_de_passe: mot_de_passe,
              role: 'client',
              account_status: 'pending',
              subscription_plan: 'Essai Gratuit 7 Jours',
              subscription_status: 'trial',
              payment_status: 'none',
              total_paid_fcfa: 0,
              device: 'Formulaire Interne Emris'
            }
          ])
          .select();

        if (error) throw error;

        alert("Inscription réussie ! Votre compte est enregistré. Bienvenue dans Emris.");
        authModal.classList.remove('active');
        registerForm.reset();
        errorBox.classList.add('hidden');
      } catch (err) {
        console.error("Erreur d'inscription Supabase :", err);
        errorBox.textContent = "Erreur : Cet email est peut-être déjà utilisé ou la base est inaccessible.";
        errorBox.classList.remove('hidden');
      }
    });
  }

  // CHARGEMENT DES UTILISATEURS DANS LE TABLEAU DE BORD ADMIN
  async function loadAdminUsersFromSupabase() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Chargement des données Supabase...</td></tr>`;

    try {
      const { data: users, error } = await db
        .from('utilisateurs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      document.getElementById('statTotalUsers').textContent = users.length;
      document.getElementById('statActiveUsers').textContent = users.filter(u => u.account_status === 'active').length;
      document.getElementById('statPendingUsers').textContent = users.filter(u => u.account_status === 'pending').length;

      if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun utilisateur enregistré pour le moment.</td></tr>`;
        return;
      }

      tableBody.innerHTML = '';
      users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="font-semibold text-white">${escapeHtml(user.nom)}</div>
            <div class="text-xs text-slate-400">ID: ${user.id}</div>
          </td>
          <td>
            <div>${escapeHtml(user.email)}</div>
            <div class="text-xs text-emerald-400">${escapeHtml(user.telephone || 'Non renseigné')}</div>
          </td>
          <td class="text-xs text-slate-300">${new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
          <td><span class="badge-plan">${escapeHtml(user.subscription_plan || 'Essai')}</span></td>
          <td><span class="badge-status ${user.account_status}">${user.account_status}</span></td>
          <td><span class="text-xs text-amber-400"><i class="fa-solid fa-database"></i> Supabase</span></td>
          <td class="text-right">
            <button onclick="window.deleteUserRecord('${user.id}', '${escapeHtml(user.nom).replace(/'/g, "\\'")}')" class="btn-action-delete" title="Supprimer définitivement">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

    } catch (err) {
      console.error("Erreur de chargement admin :", err);
      tableBody.innerHTML = `<tr><td colspan="7" class="empty-state text-red-400">Erreur lors de la récupération des données Supabase.</td></tr>`;
    }
  }

  // SUPPRESSION SÉCURISÉE (Aucun compte ne disparaît sans validation explicite)
  window.deleteUserRecord = async function(userId, userName) {
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteTargetUserName = document.getElementById('deleteTargetUserName');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');

    deleteTargetUserName.textContent = userName;
    deleteConfirmModal.classList.add('active');

    const newConfirmBtn = btnConfirmDelete.cloneNode(true);
    btnConfirmDelete.parentNode.replaceChild(newConfirmBtn, btnConfirmDelete);

    newConfirmBtn.addEventListener('click', async () => {
      try {
        const { error } = await db
          .from('utilisateurs')
          .delete()
          .eq('id', userId);

        if (error) throw error;

        deleteConfirmModal.classList.remove('active');
        loadAdminUsersFromSupabase();
      } catch (err) {
        console.error("Erreur lors de la suppression :", err);
        alert("Impossible de supprimer ce compte de Supabase.");
      }
    });

    const closeAction = () => deleteConfirmModal.classList.remove('active');
    btnCancelDelete.onclick = closeAction;
    btnCloseDeleteModal.onclick = closeAction;
  };

  const btnRefresh = document.getElementById('btnRefreshSupabase');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadAdminUsersFromSupabase);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
});
