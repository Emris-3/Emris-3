// api/delete-user.js
// Exemple de route serverless sécurisée pour supprimer un utilisateur en production.
// Fonctionne avec Vercel / Netlify / un backend Node.js minimal.
// IMPORTANT : NE JAMAIS exposer SUPABASE_SERVICE_ROLE_KEY côté client.

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d’environnement.');
}

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

module.exports = async (req, res) => {
  try {
    // Sécurité minimale : exige un secret côté serveur
    const providedSecret = req.headers['x-admin-secret'] || req.headers['authorization'];
    const expectedSecret = process.env.ADMIN_API_SECRET;

    if (!expectedSecret) {
      return res.status(500).json({
        ok: false,
        error: 'ADMIN_API_SECRET non configuré côté serveur.'
      });
    }

    const validHeader = providedSecret === expectedSecret ||
      (typeof providedSecret === 'string' && providedSecret.replace('Bearer ', '') === expectedSecret);

    if (!validHeader) {
      return res.status(401).json({
        ok: false,
        error: 'Non autorisé. Secret admin manquant ou invalide.'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        ok: false,
        error: 'Client Supabase admin non initialisé.'
      });
    }

    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Paramètre id requis.'
      });
    }

    const { error } = await supabaseAdmin
      .from('utilisateurs')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      message: 'Utilisateur supprimé avec succès.'
    });

  } catch (error) {
    console.error('Erreur suppression Supabase admin:', error);
    return res.status(500).json({
      ok: false,
      error: 'Erreur interne lors de la suppression.'
    });
  }
};

// --------------------------------------------------
// Exemple de variables d'environnement à configurer :
// SUPABASE_URL=https://xxxxx.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=service_role_xxxxxxxxxxx
// ADMIN_API_SECRET=un_secret_strong_au_moins_32_chars
// --------------------------------------------------
// Exemple d'appel côté serveur (curl) :
// curl -X POST https://votre-serveur/api/delete-user \
//   -H "X-Admin-Secret: votre_secret" \
//   -H "Content-Type: application/json" \
//   -d '{"id":"UUID_DE_L_UTILISATEUR"}'
// --------------------------------------------------
