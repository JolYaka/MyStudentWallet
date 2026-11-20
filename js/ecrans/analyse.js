// Analyse : où part l'argent, budgets, évolution sur six mois.
// Tout est exprimé dans la devise principale, au taux du jour.

import {
  etat, bilanMois, moisDe, aujourdhui, ajouterMois, moisPrecedents, categorie, categoriesDe, enregistrer, majReglages,
} from '../store.js';
import { formater, versUnites, versTexte, symbole } from '../money.js';
import { esc, nomMois, nomMoisCourt, ouvrirFeuille, fermerFeuille, toast, $, $$ } from '../ui.js';
import { icon } from '../icons.js';
import { jauges, vide } from './commun.js';

export function rendreAnalyse(params) {
  const dp = etat.reglages.deviseP;
  const mois = params.get('mois') || moisDe(aujourdhui());
  const b = bilanMois(mois);
  const net = b.entrees - b.sorties;

  // Répartition : barres classées de la plus grosse à la plus petite.
  const parts = [...b.parCategorie]
    .map(([id, m]) => ({ k: categorie(id), m }))
    .filter((x) => x.m > 0)
    .sort((a, c) => c.m - a.m);
  const max = parts[0]?.m || 1;

  const budgets = categoriesDe('depense')
    .filter((k) => k.budget)
    .map((k) => ({ k, depense: b.parCategorie.get(k.id) || 0, budget: k.budget }));

  // Six mois jusqu'au mois affiché.
  const serie = moisPrecedents(mois, 6).map((m) => ({ m, ...bilanMois(m) }));
  const maxSerie = Math.max(1, ...serie.map((s) => Math.max(s.sorties, s.entrees)));

  const moisSuivant = moisDe(ajouterMois(mois + '-01', 1));
  const pasDeSuivant = moisSuivant > moisDe(aujourdhui());

  return `
    <header class="tete-ecran"><h1>Analyse</h1></header>

    <nav class="mois-nav" aria-label="Mois">
      <a class="btn-icone" href="#/analyse?mois=${moisDe(ajouterMois(mois + '-01', -1))}" aria-label="Mois précédent">${icon('chevron-left')}</a>
      <span>${esc(nomMois(mois))}</span>
      ${pasDeSuivant ? '<span class="btn-icone inactif"></span>' : `<a class="btn-icone" href="#/analyse?mois=${moisSuivant}" aria-label="Mois suivant">${icon('chevron-right')}</a>`}
    </nav>

    <section class="carte bilan">
      <div><span class="etiquette">Reçu</span><strong class="pos">${formater(b.entrees, dp)}</strong></div>
      <div><span class="etiquette">Dépensé</span><strong>${formater(b.sorties, dp)}</strong></div>
      <div><span class="etiquette">${net >= 0 ? 'Mis de côté' : 'Déficit'}</span><strong class="${net < 0 ? 'neg' : ''}">${formater(net, dp, { signe: true })}</strong></div>
    </section>

    <section class="carte">
      <div class="carte-tete"><h2>Où part l'argent</h2></div>
      ${parts.length ? `<ul class="barres">${parts.map(({ k, m }) => `
        <li>
          <div class="barre-tete">
            <span>${icon(k?.icone || 'circle-ellipsis', 16)} ${esc(k?.nom || 'Sans catégorie')}</span>
            <span><strong>${formater(m, dp)}</strong> <span class="texte-doux">${Math.round((m / b.sorties) * 100)} %</span></span>
          </div>
          <div class="barre-piste"><div class="barre-val" style="width:${Math.max(1.5, (m / max) * 100).toFixed(1)}%"></div></div>
        </li>`).join('')}</ul>`
        : vide('chart-column', 'Aucune dépense', "Aucune dépense n'est enregistrée pour ce mois.")}
    </section>

    <section class="carte">
      <div class="carte-tete"><h2>Budgets</h2><button class="btn-lien" data-budgets>${budgets.length ? 'Modifier' : 'Définir'}</button></div>
      ${budgets.length ? jauges(budgets)
        : `<p class="texte-doux">Fixez un plafond mensuel par catégorie pour savoir où vous en êtes au fil du mois.</p>`}
    </section>

    <section class="carte">
      <div class="carte-tete"><h2>Six derniers mois</h2>
        <span class="legende"><i class="pt-dep"></i>Dépensé <i class="pt-rec"></i>Reçu</span></div>
      <div class="colonnes" role="list">
        ${serie.map((s) => `
          <button class="col ${s.m === mois ? 'actif' : ''}" role="listitem" data-col="${s.m}"
            aria-label="${esc(nomMois(s.m))} : ${formater(s.sorties, dp)} dépensés, ${formater(s.entrees, dp)} reçus">
            <span class="col-barres">
              <span class="cb dep" style="height:${((s.sorties / maxSerie) * 100).toFixed(1)}%"></span>
              <span class="cb rec" style="height:${((s.entrees / maxSerie) * 100).toFixed(1)}%"></span>
            </span>
            <span class="col-mois">${esc(nomMoisCourt(s.m))}</span>
          </button>`).join('')}
      </div>
      <p class="col-detail" id="col-detail" aria-live="polite">${detailMois(serie.find((s) => s.m === mois), dp)}</p>
    </section>
  `;
}

function detailMois(s, dp) {
  return `${esc(nomMois(s.m))} : <strong>${formater(s.sorties, dp)}</strong> dépensés, <strong class="pos">${formater(s.entrees, dp)}</strong> reçus`;
}

export function brancherAnalyse(racine, params) {
  const dp = etat.reglages.deviseP;
  const mois = params.get('mois') || moisDe(aujourdhui());
  $$('[data-col]', racine).forEach((b) => b.onclick = () => {
    $$('[data-col]', racine).forEach((x) => x.classList.toggle('vise', x === b));
    const s = { m: b.dataset.col, ...bilanMois(b.dataset.col) };
    $('#col-detail', racine).innerHTML = detailMois(s, dp);
  });
  $('[data-budgets]', racine)?.addEventListener('click', () => ouvrirBudgets(mois));
}

export function ouvrirBudgets() {
  const dp = etat.reglages.deviseP;
  const cats = categoriesDe('depense');
  const f = ouvrirFeuille({
    titre: 'Budgets mensuels',
    contenu: `
      <p class="texte-doux">Plafond par mois, en ${esc(symbole(dp))}. Laissez vide pour ne pas suivre une catégorie.</p>
      <div class="liste-reglages">
        ${cats.map((k) => `
          <label class="ligne-reglage">
            <span class="pastille">${icon(k.icone, 18)}</span>
            <span class="lr-nom">${esc(k.nom)}</span>
            <input class="entree entree-courte" inputmode="decimal" data-budget="${k.id}"
              value="${k.budget ? esc(versTexte(k.budget, dp)) : ''}" placeholder="Aucun" aria-label="Budget ${esc(k.nom)}">
          </label>`).join('')}
      </div>`,
    pied: '<button class="btn btn-prim" data-ok>Enregistrer les budgets</button>',
  });
  $('[data-ok]', f).onclick = async () => {
    for (const champ of $$('[data-budget]', f)) {
      const k = cats.find((c) => c.id === champ.dataset.budget);
      const v = champ.value.trim() ? versUnites(champ.value, dp) : null;
      if ((v || null) !== (k.budget || null)) await enregistrer('categories', { ...k, budget: v || null }, false);
    }
    await majReglages({}); // redessine l'écran une seule fois, après toutes les écritures
    fermerFeuille();
    toast('Budgets enregistrés');
  };
}
