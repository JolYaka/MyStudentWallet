// Mise à jour des taux de change, au plus une fois toutes les 12 heures et
// seulement quand il y a du réseau. Sans réseau, on garde les derniers taux.

import { etat, majReglages } from './store.js';

const SOURCE = 'https://open.er-api.com/v6/latest/EUR';
const DOUZE_HEURES = 12 * 3600 * 1000;

export async function majTaux({ forcer = false } = {}) {
  const r = etat.reglages;
  const age = r.tauxMaj ? Date.now() - new Date(r.tauxMaj).getTime() : Infinity;
  if (!forcer && age < DOUZE_HEURES) return 'recent';
  if (!navigator.onLine) return 'hors-ligne';
  try {
    const rep = await fetch(SOURCE, { cache: 'no-store' });
    const json = await rep.json();
    if (json.result !== 'success' || !json.rates) throw new Error('réponse inattendue');
    await majReglages({ taux: json.rates, tauxMaj: new Date().toISOString() });
    return 'ok';
  } catch {
    return 'echec';
  }
}
