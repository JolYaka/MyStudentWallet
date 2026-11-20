// Historique : toutes les opérations, groupées par jour, avec recherche et
// filtres. Le filtre choisi est gardé dans l'adresse (#/operations?type=...)
// pour que le bouton retour du téléphone le retrouve.

import { etat, compte, categorie, comptesActifs, montantPrincipal, aujourdhui, moisDe, ajouterMois } from '../store.js';
import { formater } from '../money.js';
import { esc, jourRelatif, nomMois } from '../ui.js';
import { icon } from '../icons.js';
import { ligneOperation, vide } from './commun.js';

const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function rendreOperations(params) {
  const dp = etat.reglages.deviseP;
  const mois = params.get('mois') || moisDe(aujourdhui());
  const type = params.get('type') || 'tout';
  const compteId = params.get('compte') || '';
  const q = (params.get('q') || '').trim();

  let ops = etat.operations;
  // Une recherche porte sur tout l'historique, pas seulement sur le mois.
  if (q) {
    const mots = sansAccent(q).split(/\s+/);
    ops = ops.filter((o) => {
      const texte = sansAccent([o.note, categorie(o.categorieId)?.nom, compte(o.compteId)?.nom].join(' '));
      return mots.every((m) => texte.includes(m));
    });
  } else {
    ops = ops.filter((o) => moisDe(o.date) === mois);
  }
  if (type !== 'tout') ops = ops.filter((o) => o.type === type);
  if (compteId) ops = ops.filter((o) => o.compteId === compteId || o.versCompteId === compteId);
  ops = [...ops].sort((a, b) => b.date.localeCompare(a.date) || b.creeLe - a.creeLe);

  // Groupes par jour, avec le net du jour en devise principale.
  const jours = new Map();
  for (const o of ops) {
    if (!jours.has(o.date)) jours.set(o.date, []);
    jours.get(o.date).push(o);
  }
  let entrees = 0;
  let sorties = 0;
  for (const o of ops) {
    if (o.type === 'revenu') entrees += montantPrincipal(o);
    if (o.type === 'depense') sorties += montantPrincipal(o);
  }

  const lien = (changements) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changements)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    const s = p.toString();
    return '#/operations' + (s ? '?' + s : '');
  };
  const moisSuivant = moisDe(ajouterMois(mois + '-01', 1));
  const pasDeSuivant = moisSuivant > moisDe(aujourdhui());

  return `
    <header class="tete-ecran">
      <h1>Opérations</h1>
    </header>

    <form class="recherche" role="search" data-recherche>
      ${icon('search', 18)}
      <input type="search" name="q" value="${esc(q)}" placeholder="Rechercher une note, une catégorie" aria-label="Rechercher" enterkeyhint="search">
      ${q ? `<a class="btn-icone" href="${lien({ q: '' })}" aria-label="Effacer la recherche">${icon('x', 16)}</a>` : ''}
    </form>

    ${q ? `<p class="texte-doux resultat-recherche">${ops.length} résultat${ops.length > 1 ? 's' : ''} sur tout l'historique</p>` : `
      <nav class="mois-nav" aria-label="Mois">
        <a class="btn-icone" href="${lien({ mois: moisDe(ajouterMois(mois + '-01', -1)) })}" aria-label="Mois précédent">${icon('chevron-left')}</a>
        <span>${esc(nomMois(mois))}</span>
        ${pasDeSuivant ? '<span class="btn-icone inactif"></span>' : `<a class="btn-icone" href="${lien({ mois: moisSuivant })}" aria-label="Mois suivant">${icon('chevron-right')}</a>`}
      </nav>`}

    <div class="filtres">
      ${[['tout', 'Tout'], ['depense', 'Dépenses'], ['revenu', 'Revenus'], ['virement', 'Virements']].map(([v, l]) => `
        <a class="puce" aria-pressed="${type === v}" href="${lien({ type: v === 'tout' ? '' : v })}">${l}</a>`).join('')}
      ${comptesActifs().length > 1 ? `
        <label class="puce puce-select" aria-pressed="${!!compteId}">
          ${icon('wallet', 14)}
          <select data-filtre-compte aria-label="Compte">
            <option value="">Tous les comptes</option>
            ${comptesActifs().map((c) => `<option value="${c.id}" ${c.id === compteId ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}
          </select>
        </label>` : ''}
    </div>

    ${ops.length && type !== 'virement' ? `
      <p class="totaux">
        ${type !== 'depense' ? `<span>Reçu <strong class="pos">${formater(entrees, dp)}</strong></span>` : ''}
        ${type !== 'revenu' ? `<span>Dépensé <strong>${formater(sorties, dp)}</strong></span>` : ''}
      </p>` : ''}

    ${ops.length ? [...jours].map(([jour, liste]) => {
      const net = liste.reduce((t, o) => t + (o.type === 'revenu' ? 1 : o.type === 'depense' ? -1 : 0) * montantPrincipal(o), 0);
      return `
        <section class="jour">
          <h2 class="jour-tete"><span>${esc(jourRelatif(jour, aujourdhui()))}</span>
            ${net ? `<span class="${net > 0 ? 'pos' : ''}">${formater(net, dp, { signe: true })}</span>` : ''}</h2>
          <div class="liste carte">${liste.map(ligneOperation).join('')}</div>
        </section>`;
    }).join('') : (q
      ? vide('search', 'Aucun résultat', `Rien ne correspond à « ${q} ».`)
      : vide('receipt', 'Rien ce mois-ci', 'Les opérations de ce mois apparaîtront ici.'))}
  `;
}

// Les interactions propres à cet écran.
export function brancherOperations(racine, params) {
  const form = racine.querySelector('[data-recherche]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = new URLSearchParams(params);
    const q = new FormData(form).get('q').trim();
    if (q) p.set('q', q); else p.delete('q');
    location.hash = '#/operations' + (p.toString() ? '?' + p : '');
  });
  racine.querySelector('[data-filtre-compte]')?.addEventListener('change', (e) => {
    const p = new URLSearchParams(params);
    if (e.target.value) p.set('compte', e.target.value); else p.delete('compte');
    location.hash = '#/operations' + (p.toString() ? '?' + p : '');
  });
}
