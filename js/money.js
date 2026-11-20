// Montants, devises et conversion.
//
// Règle d'or : un montant est TOUJOURS stocké en entier, dans la plus petite
// unité de sa devise (millimes pour le dinar, centimes pour l'euro, francs
// pour le FCFA). Les nombres à virgule (0.1 + 0.2 = 0.30000000000000004)
// faussent les totaux ; les entiers, jamais.

// Devises proposées en premier dans les listes. Toutes les autres devises ISO
// restent utilisables si les taux de change les connaissent.
export const DEVISES_COURANTES = [
  ['TND', 'Dinar tunisien'],
  ['XOF', 'Franc CFA (BCEAO)'],
  ['EUR', 'Euro'],
  ['USD', 'Dollar américain'],
  ['XAF', 'Franc CFA (BEAC)'],
  ['MAD', 'Dirham marocain'],
  ['DZD', 'Dinar algérien'],
  ['GBP', 'Livre sterling'],
  ['CAD', 'Dollar canadien'],
  ['CHF', 'Franc suisse'],
  ['NGN', 'Naira'],
  ['GHS', 'Cedi'],
];

const cacheDecimales = new Map();

// Nombre de décimales d'une devise : 3 pour TND, 2 pour EUR, 0 pour XOF.
export function decimales(devise) {
  if (!cacheDecimales.has(devise)) {
    let d = 2;
    try {
      d = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise })
        .resolvedOptions().maximumFractionDigits;
    } catch { /* devise inconnue du navigateur : 2 par défaut */ }
    cacheDecimales.set(devise, d);
  }
  return cacheDecimales.get(devise);
}

// Symbole court affiché à côté des montants.
const SYMBOLES = { TND: 'DT', XOF: 'FCFA', XAF: 'FCFA', EUR: '€', USD: '$', GBP: '£', MAD: 'DH', DZD: 'DA' };
export function symbole(devise) {
  return SYMBOLES[devise] || devise;
}

// "12,5" ou "12.5" tapé par l'utilisateur -> 12500 (en millimes pour TND).
// Renvoie null si la saisie n'est pas un montant valide.
export function versUnites(texte, devise) {
  if (texte == null) return null;
  const propre = String(texte).replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(propre) || propre === '' || propre === '.') return null;
  const d = decimales(devise);
  const [ent, frac = ''] = propre.split('.');
  const fracCalee = (frac + '0'.repeat(d)).slice(0, d);
  return Number(ent || '0') * 10 ** d + Number(fracCalee || '0');
}

// 12500 (TND) -> "12,5" pour remplir un champ de saisie.
export function versTexte(unites, devise) {
  const d = decimales(devise);
  const v = unites / 10 ** d;
  return String(v).replace('.', ',');
}

const cacheFormat = new Map();
function formateur(devise, compact) {
  const cle = devise + (compact ? 'c' : '');
  if (!cacheFormat.has(cle)) {
    const d = decimales(devise);
    cacheFormat.set(cle, new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: compact ? 0 : d,
      maximumFractionDigits: compact ? (d > 0 ? 1 : 0) : d,
      notation: compact ? 'compact' : 'standard',
    }));
  }
  return cacheFormat.get(cle);
}

// 12500, 'TND' -> "12,500 DT". signe: true ajoute "+" aux montants positifs.
export function formater(unites, devise, { signe = false, compact = false, sansSymbole = false } = {}) {
  const v = unites / 10 ** decimales(devise);
  let t = formateur(devise, compact).format(Math.abs(v));
  if (!sansSymbole) t += ' ' + symbole(devise);
  if (v < 0) return '-' + t;
  if (signe && v > 0) return '+' + t;
  return t;
}

// ---- Conversion ----------------------------------------------------------
//
// Les taux sont exprimés par rapport à l'euro : taux.TND = 3,35 veut dire
// 1 EUR = 3,35 TND. Ils viennent d'open.er-api.com (gratuit, sans clé) et sont
// gardés en mémoire locale pour fonctionner hors ligne. L'utilisateur peut en
// forcer un à la main (taux de son bureau de change, par exemple).

// Taux de secours, utilisés tant qu'aucune mise à jour n'a réussi.
// Le franc CFA est arrimé à l'euro : 655,957 est un taux fixe officiel.
export const TAUX_SECOURS = {
  EUR: 1, XOF: 655.957, XAF: 655.957, TND: 3.35, USD: 1.10, GBP: 0.84,
  MAD: 10.9, DZD: 150, CAD: 1.57, CHF: 0.94, NGN: 1480, GHS: 13,
};

// unites en devise "de" -> unites en devise "vers". null si un taux manque.
export function convertir(unites, de, vers, taux) {
  if (de === vers) return unites;
  const tDe = taux[de];
  const tVers = taux[vers];
  if (!tDe || !tVers) return null;
  const valeur = unites / 10 ** decimales(de);
  const enVers = (valeur / tDe) * tVers;
  return Math.round(enVers * 10 ** decimales(vers));
}

// 1 "de" = combien de "vers", pour l'affichage d'un taux.
export function tauxCroise(de, vers, taux) {
  if (!taux[de] || !taux[vers]) return null;
  return taux[vers] / taux[de];
}
