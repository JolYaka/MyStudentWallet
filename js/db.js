// Stockage local avec IndexedDB, la base de données intégrée au navigateur.
// Les données ne quittent jamais le téléphone.
//
// Au démarrage on charge tout en mémoire (quelques milliers d'opérations au
// plus pour un étudiant, c'est instantané), puis chaque modification est
// écrite à la fois en mémoire et dans la base.

const NOM_BASE = 'mystudentwallet';
const VERSION = 1;
export const TABLES = ['comptes', 'categories', 'operations', 'recurrences', 'reglages'];

let base = null;

function ouvrir() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOM_BASE, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const t of TABLES) {
        if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transaction(table, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = base.transaction(table, mode);
    const store = tx.objectStore(table);
    const res = action(store);
    tx.oncomplete = () => resolve(res?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function demarrer() {
  base = await ouvrir();
  // Demande au navigateur de ne pas effacer nos données s'il manque de place.
  try { await navigator.storage?.persist?.(); } catch { /* facultatif */ }
  const donnees = {};
  for (const t of TABLES) {
    donnees[t] = await transaction(t, 'readonly', (s) => s.getAll());
  }
  return donnees;
}

export const ecrire = (table, objet) => transaction(table, 'readwrite', (s) => s.put(objet));
export const effacer = (table, id) => transaction(table, 'readwrite', (s) => s.delete(id));

// Remplace tout le contenu de la base (restauration d'une sauvegarde).
export function remplacerTout(donnees) {
  return new Promise((resolve, reject) => {
    const tx = base.transaction(TABLES, 'readwrite');
    for (const t of TABLES) {
      const s = tx.objectStore(t);
      s.clear();
      for (const o of donnees[t] || []) s.put(o);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function nouvelId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}
