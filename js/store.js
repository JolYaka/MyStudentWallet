// L'état de l'application et toute la logique métier (soldes, budgets,
// récurrences, « reste par jour »). Les écrans ne font qu'afficher ce que ce
// fichier calcule : aucune règle de calcul n'est cachée dans l'interface.

import * as db from './db.js';
import { convertir, TAUX_SECOURS } from './money.js';

export const etat = {
  comptes: [],
  categories: [],
  operations: [],
  recurrences: [],
  reglages: null,
};

const ecouteurs = new Set();
export const surChangement = (f) => ecouteurs.add(f);
const prevenir = () => ecouteurs.forEach((f) => f());

// ---- Dates (toujours en heure locale, au format AAAA-MM-JJ) --------------

export function versISO(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export const aujourdhui = () => versISO(new Date());
export function depuisISO(s) {
  const [a, m, j] = s.split('-').map(Number);
  return new Date(a, m - 1, j);
}
export function ajouterJours(s, n) {
  const d = depuisISO(s);
  d.setDate(d.getDate() + n);
  return versISO(d);
}
export function ajouterMois(s, n) {
  const d = depuisISO(s);
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  // 31 janvier + 1 mois = 28 ou 29 février, pas 3 mars.
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernier));
  return versISO(d);
}
export const ecartJours = (a, b) => Math.round((depuisISO(b) - depuisISO(a)) / 86400000);
export const moisDe = (s) => s.slice(0, 7);

// ---- Réglages ------------------------------------------------------------

const REGLAGES_DEFAUT = {
  id: 'app',
  initialise: false,
  deviseP: 'TND',
  theme: 'auto',
  prochaineRentree: null,
  taux: { ...TAUX_SECOURS },
  tauxMaj: null,
  tauxManuels: {},
};

// Les taux effectivement utilisés : ceux du réseau, corrigés par les taux
// saisis à la main.
export function taux() {
  const r = etat.reglages;
  return { ...TAUX_SECOURS, ...r.taux, ...r.tauxManuels };
}

export const versPrincipale = (unites, devise) =>
  convertir(unites, devise, etat.reglages.deviseP, taux()) ?? 0;

export async function majReglages(changements) {
  etat.reglages = { ...etat.reglages, ...changements };
  await db.ecrire('reglages', etat.reglages);
  prevenir();
}

// ---- Démarrage -----------------------------------------------------------

export async function demarrer() {
  const d = await db.demarrer();
  etat.comptes = d.comptes;
  etat.categories = d.categories;
  etat.operations = d.operations;
  etat.recurrences = d.recurrences;
  etat.reglages = { ...REGLAGES_DEFAUT, ...(d.reglages.find((r) => r.id === 'app') || {}) };
  if (etat.reglages.initialise) await executerRecurrences();
}

// Catégories créées au premier lancement. Toutes modifiables ensuite.
const CATEGORIES_DEPART = [
  ['depense', 'Courses', 'shopping-cart'],
  ['depense', 'Restaurant et café', 'utensils'],
  ['depense', 'Transport', 'bus'],
  ['depense', 'Logement', 'house'],
  ['depense', 'Téléphone et internet', 'wifi'],
  ['depense', 'Études', 'graduation-cap'],
  ['depense', 'Santé', 'heart-pulse'],
  ['depense', 'Loisirs', 'gamepad-2'],
  ['depense', 'Vêtements', 'shirt'],
  ['depense', 'Voyage', 'plane'],
  ['depense', 'Autre dépense', 'circle-ellipsis'],
  ['revenu', 'Bourse', 'landmark'],
  ['revenu', 'Famille', 'users'],
  ['revenu', 'Job', 'briefcase'],
  ['revenu', 'Autre revenu', 'piggy-bank'],
];

export async function initialiser({ deviseP, compteNom, compteDevise, soldeInitial }) {
  for (const [i, [type, nom, icone]] of CATEGORIES_DEPART.entries()) {
    await enregistrer('categories', { id: db.nouvelId(), type, nom, icone, budget: null, ordre: i, archive: false }, false);
  }
  await enregistrer('comptes', {
    id: db.nouvelId(), nom: compteNom, devise: compteDevise, icone: 'wallet',
    soldeInitial, ordre: 0, archive: false,
  }, false);
  await majReglages({ deviseP, initialise: true });
}

// ---- Écriture générique ---------------------------------------------------

export async function enregistrer(table, objet, notifier = true) {
  const liste = etat[table];
  const i = liste.findIndex((o) => o.id === objet.id);
  if (i >= 0) liste[i] = objet; else liste.push(objet);
  await db.ecrire(table, objet);
  if (notifier) prevenir();
  return objet;
}

export async function supprimer(table, id) {
  const liste = etat[table];
  const i = liste.findIndex((o) => o.id === id);
  if (i < 0) return null;
  const [ancien] = liste.splice(i, 1);
  await db.effacer(table, id);
  prevenir();
  return ancien;
}

export async function restaurer(donnees) {
  await db.remplacerTout(donnees);
  await demarrer();
  prevenir();
}

export const nouvelId = db.nouvelId;
export const compte = (id) => etat.comptes.find((c) => c.id === id);
export const categorie = (id) => etat.categories.find((c) => c.id === id);
export const comptesActifs = () => etat.comptes.filter((c) => !c.archive).sort((a, b) => a.ordre - b.ordre);
export const categoriesDe = (type) =>
  etat.categories.filter((c) => c.type === type && !c.archive).sort((a, b) => a.ordre - b.ordre);

// Un compte ou une catégorie déjà utilisés ne sont pas effacés mais archivés,
// pour ne pas casser l'historique.
export const estUtilise = (champ, id) =>
  etat.operations.some((o) => o[champ] === id || (champ === 'compteId' && o.versCompteId === id)) ||
  etat.recurrences.some((r) => r[champ] === id);

// ---- Soldes ---------------------------------------------------------------

// Effet d'une opération sur un compte donné, en unités de ce compte.
function effetSur(op, compteId) {
  let e = 0;
  if (op.compteId === compteId) e += op.type === 'revenu' ? op.montant : -op.montant;
  if (op.type === 'virement' && op.versCompteId === compteId) e += op.montantArrivee ?? op.montant;
  return e;
}

export function soldeCompte(c, jusquA = null) {
  let s = c.soldeInitial || 0;
  for (const op of etat.operations) {
    if (jusquA && op.date > jusquA) continue;
    s += effetSur(op, c.id);
  }
  return s;
}

export const soldeTotal = () =>
  comptesActifs().reduce((t, c) => t + versPrincipale(soldeCompte(c), c.devise), 0);

// Montant d'une opération converti dans la devise principale.
export function montantPrincipal(op) {
  const c = compte(op.compteId);
  return versPrincipale(op.montant, c?.devise || etat.reglages.deviseP);
}

// ---- Mois --------------------------------------------------------------------

export function bilanMois(mois) {
  let entrees = 0;
  let sorties = 0;
  const parCategorie = new Map();
  for (const op of etat.operations) {
    if (moisDe(op.date) !== mois || op.type === 'virement') continue;
    const m = montantPrincipal(op);
    if (op.type === 'revenu') entrees += m;
    else {
      sorties += m;
      parCategorie.set(op.categorieId, (parCategorie.get(op.categorieId) || 0) + m);
    }
  }
  return { entrees, sorties, parCategorie };
}

export function moisPrecedents(mois, n) {
  const res = [];
  let d = mois + '-01';
  for (let i = 0; i < n; i++) {
    res.unshift(moisDe(d));
    d = ajouterMois(d, -1);
  }
  return res;
}

// ---- Reste à dépenser par jour --------------------------------------------
//
// Combien je peux dépenser chaque jour jusqu'à ma prochaine rentrée d'argent,
// une fois mis de côté ce qui va forcément partir (loyer, forfait...).

export function prochaineEcheance() {
  const auj = aujourdhui();
  const manuelle = etat.reglages.prochaineRentree;
  if (manuelle && manuelle > auj) return { date: manuelle, source: 'manuelle' };
  const revenus = etat.recurrences
    .filter((r) => r.active && r.type === 'revenu' && r.prochaine > auj)
    .sort((a, b) => a.prochaine.localeCompare(b.prochaine));
  if (revenus.length) return { date: revenus[0].prochaine, source: 'recurrence', recurrence: revenus[0] };
  const finMois = new Date();
  finMois.setMonth(finMois.getMonth() + 1, 1);
  return { date: versISO(finMois), source: 'mois' };
}

// Dépenses récurrentes qui tomberont avant une date, en devise principale.
export function depensesPrevues(avant) {
  let total = 0;
  const liste = [];
  for (const r of etat.recurrences) {
    if (!r.active || r.type !== 'depense') continue;
    let d = r.prochaine;
    let garde = 0;
    while (d < avant && garde++ < 60) {
      const c = compte(r.compteId);
      const m = versPrincipale(r.montant, c?.devise || etat.reglages.deviseP);
      total += m;
      liste.push({ r, date: d, montant: m });
      d = suivante(r, d);
    }
  }
  return { total, liste };
}

// Début de la période en cours : la dernière rentrée d'argent des 45 derniers
// jours, sinon le premier du mois.
function debutPeriode() {
  const auj = aujourdhui();
  const limite = ajouterJours(auj, -45);
  let debut = auj.slice(0, 8) + '01';
  const revenus = etat.operations
    .filter((o) => o.type === 'revenu' && o.date <= auj && o.date >= limite)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (revenus.length) debut = revenus[0].date;
  return debut;
}

export function resteParJour() {
  const auj = aujourdhui();
  const echeance = prochaineEcheance();
  const jours = Math.max(1, ecartJours(auj, echeance.date));
  const prevues = depensesPrevues(echeance.date);
  const dispo = soldeTotal();
  const libre = dispo - prevues.total;
  const debut = debutPeriode();
  return {
    echeance, jours, dispo, prevues, libre,
    parJour: Math.floor(libre / jours),
    debut,
    joursPasses: Math.max(0, ecartJours(debut, auj)),
    depenseAujourdhui: etat.operations
      .filter((o) => o.date === auj && o.type === 'depense')
      .reduce((t, o) => t + montantPrincipal(o), 0),
  };
}

// ---- Récurrences -----------------------------------------------------------

export function suivante(r, date) {
  if (r.frequence === 'hebdo') return ajouterJours(date, 7);
  if (r.frequence === 'annuel') return ajouterMois(date, 12);
  return ajouterMois(date, 1);
}

// Crée les opérations des récurrences arrivées à échéance (au lancement).
export async function executerRecurrences() {
  const auj = aujourdhui();
  let cree = 0;
  for (const r of etat.recurrences) {
    if (!r.active) continue;
    let garde = 0;
    while (r.prochaine <= auj && garde++ < 60) {
      await enregistrer('operations', {
        id: db.nouvelId(), type: r.type, montant: r.montant, compteId: r.compteId,
        categorieId: r.categorieId, note: r.note || '', date: r.prochaine,
        creeLe: Date.now(), recurrenceId: r.id,
      }, false);
      r.prochaine = suivante(r, r.prochaine);
      cree++;
    }
    if (garde) await db.ecrire('recurrences', r);
  }
  if (cree) prevenir();
  return cree;
}
