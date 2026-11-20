// Petits outils d'interface partagés par tous les écrans : échappement du
// texte, feuilles qui montent du bas de l'écran, messages temporaires.

import { icon } from './icons.js';

// Tout texte saisi par l'utilisateur passe par esc() avant d'être affiché,
// sinon une note contenant "<b>" casserait la page.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, racine = document) => racine.querySelector(sel);
export const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];

// ---- Feuille (panneau qui monte du bas) ------------------------------------

let feuilleOuverte = null;

export function ouvrirFeuille({ titre, contenu, pied = '', onOuvert, classe = '' }) {
  fermerFeuille(true);
  const voile = document.createElement('div');
  voile.className = 'voile';
  voile.innerHTML = `
    <section class="feuille ${classe}" role="dialog" aria-modal="true" aria-label="${esc(titre)}">
      <header class="feuille-tete">
        <h2>${esc(titre)}</h2>
        <button class="btn-icone" data-fermer aria-label="Fermer">${icon('x')}</button>
      </header>
      <div class="feuille-corps">${contenu}</div>
      ${pied ? `<footer class="feuille-pied">${pied}</footer>` : ''}
    </section>`;
  document.body.appendChild(voile);
  document.body.classList.add('fige');
  const feuille = voile.firstElementChild;
  voile.addEventListener('click', (e) => {
    if (e.target === voile || e.target.closest('[data-fermer]')) fermerFeuille();
  });
  feuilleOuverte = voile;
  requestAnimationFrame(() => voile.classList.add('ouvert'));
  // Bouton retour d'Android : ferme la feuille au lieu de quitter l'écran.
  if (!history.state?.feuille) history.pushState({ feuille: true }, '');
  onOuvert?.(feuille);
  return feuille;
}

export function fermerFeuille(sansHistorique = false) {
  if (!feuilleOuverte) return;
  const v = feuilleOuverte;
  feuilleOuverte = null;
  v.classList.remove('ouvert');
  document.body.classList.remove('fige');
  setTimeout(() => v.remove(), 220);
  if (!sansHistorique && history.state?.feuille) history.back();
}

window.addEventListener('popstate', () => {
  if (feuilleOuverte) fermerFeuille(true);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fermerFeuille();
});

// Confirmation dans l'app, à la place de la fenêtre grise du navigateur.
export function confirmer({ titre, texte, action, danger = true }) {
  return new Promise((resolve) => {
    const f = ouvrirFeuille({
      titre,
      contenu: `<p class="texte-doux">${esc(texte)}</p>`,
      pied: `<button class="btn btn-second" data-non>Annuler</button>
             <button class="btn ${danger ? 'btn-danger' : 'btn-prim'}" data-oui>${esc(action)}</button>`,
    });
    f.querySelector('[data-non]').onclick = () => { fermerFeuille(); resolve(false); };
    f.querySelector('[data-oui]').onclick = () => { fermerFeuille(); resolve(true); };
  });
}

// ---- Message temporaire, avec action « Annuler » facultative ----------------

let minuterie = null;
export function toast(texte, { action, onAction, duree = 4000 } = {}) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${esc(texte)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('visible'); onAction?.(); };
  t.classList.add('visible');
  clearTimeout(minuterie);
  minuterie = setTimeout(() => t.classList.remove('visible'), duree);
}

// ---- Téléchargement d'un fichier généré --------------------------------------

export function telecharger(nom, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Dates lisibles ------------------------------------------------------------

const fmtJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fmtMois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const fmtMoisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

const parse = (s) => { const [a, m, j] = s.split('-').map(Number); return new Date(a, m - 1, j || 1); };
const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const dateLongue = (s) => maj(fmtJour.format(parse(s)));
export const dateCourte = (s) => fmtCourt.format(parse(s)).replace('.', '');
export const nomMois = (m) => maj(fmtMois.format(parse(m + '-01')));
export const nomMoisCourt = (m) => maj(fmtMoisCourt.format(parse(m + '-01')).replace('.', ''));

export function jourRelatif(s, auj) {
  const diff = Math.round((parse(auj) - parse(s)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return dateLongue(s);
}
