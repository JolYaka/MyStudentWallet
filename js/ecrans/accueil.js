// Écran d'accueil : combien j'ai, combien je peux dépenser par jour,
// où en est le mois.

import {
  etat, soldeTotal, soldeCompte, comptesActifs, resteParJour, bilanMois, moisDe,
  aujourdhui, ajouterJours, ecartJours, categoriesDe,
} from '../store.js';
import { formater, decimales, symbole } from '../money.js';
import { esc, dateLongue, dateCourte } from '../ui.js';
import { icon } from '../icons.js';
import { ligneOperation, jauges, vide } from './commun.js';

// Le gros chiffre : partie entière en grand, décimales et devise en petit.
export function grandMontant(unites, devise) {
  const t = formater(unites, devise, { sansSymbole: true });
  const d = decimales(devise);
  const coupe = d > 0 ? t.lastIndexOf(',') : -1;
  const ent = coupe >= 0 ? t.slice(0, coupe) : t;
  const dec = coupe >= 0 ? t.slice(coupe) : '';
  return `<span class="gm-ent">${ent}</span><span class="gm-dec">${dec}</span><span class="gm-dev">${esc(symbole(devise))}</span>`;
}

// La réglette : un trait par jour de la période en cours. Les jours passés
// sont éteints, aujourd'hui est marqué, les jours à venir sont ceux que
// l'argent restant doit couvrir.
function reglette(r) {
  const auj = aujourdhui();
  const total = Math.min(62, Math.max(1, ecartJours(r.debut, r.echeance.date)));
  const decalage = Math.max(0, ecartJours(r.debut, r.echeance.date) - total);
  let traits = '';
  for (let i = 0; i < total; i++) {
    const jour = ajouterJours(r.debut, i + decalage);
    const cls = jour < auj ? 'passe' : jour === auj ? 'auj' : 'avenir';
    traits += `<i class="${cls}"></i>`;
  }
  return `<div class="reglette" aria-hidden="true">${traits}</div>`;
}

export function rendreAccueil() {
  const dp = etat.reglages.deviseP;
  const auj = aujourdhui();
  const comptes = comptesActifs();
  const r = resteParJour();
  const mois = bilanMois(moisDe(auj));
  const recentes = [...etat.operations]
    .sort((a, b) => b.date.localeCompare(a.date) || b.creeLe - a.creeLe)
    .slice(0, 5);

  const budgets = categoriesDe('depense')
    .filter((k) => k.budget)
    .map((k) => ({ k, depense: mois.parCategorie.get(k.id) || 0, budget: k.budget }))
    .sort((a, b) => b.depense / b.budget - a.depense / a.budget)
    .slice(0, 3);

  const sourceEcheance = r.echeance.source === 'recurrence'
    ? esc(r.echeance.recurrence.note || 'prochain revenu')
    : r.echeance.source === 'manuelle' ? 'prochaine rentrée' : 'fin du mois';

  const negatif = r.parJour < 0;
  const depasseAuj = !negatif && r.depenseAujourdhui > r.parJour && r.parJour > 0;

  return `
    <header class="tete-ecran">
      <p class="surtitre">${esc(dateLongue(auj))}</p>
    </header>

    <section class="solde" aria-label="Solde total">
      <p class="etiquette">Solde total</p>
      <p class="grand-montant ${soldeTotal() < 0 ? 'neg' : ''}">${grandMontant(soldeTotal(), dp)}</p>
      <div class="comptes-defile">
        ${comptes.map((c) => `
          <a class="compte-puce" href="#/operations?compte=${c.id}">
            <span class="pastille">${icon(c.icone, 16)}</span>
            <span><span class="cp-nom">${esc(c.nom)}</span>
            <span class="cp-solde">${formater(soldeCompte(c), c.devise)}</span></span>
          </a>`).join('')}
      </div>
    </section>

    <section class="carte carte-reste">
      <div class="reste-tete">
        <p class="etiquette">Reste à dépenser par jour</p>
        <button class="btn-lien" data-aller="#/reglages?section=rentree">${icon('calendar', 14)} ${esc(dateCourte(r.echeance.date))}</button>
      </div>
      <p class="reste-montant ${negatif ? 'neg' : ''}">${formater(r.parJour, dp)}<span class="texte-doux"> / jour</span></p>
      ${reglette(r)}
      <p class="reste-legende">
        ${negatif
          ? `Il manque <strong>${formater(-r.libre, dp)}</strong> pour tenir jusqu'au ${esc(dateCourte(r.echeance.date))} (${sourceEcheance}).`
          : `<strong>${r.jours} jour${r.jours > 1 ? 's' : ''}</strong> à tenir jusqu'au ${esc(dateCourte(r.echeance.date))} (${sourceEcheance}).`}
        ${r.prevues.total ? `<br>${formater(r.prevues.total, dp)} déjà réservés pour ${r.prevues.liste.length} dépense${r.prevues.liste.length > 1 ? 's' : ''} prévue${r.prevues.liste.length > 1 ? 's' : ''}.` : ''}
      </p>
      ${r.depenseAujourdhui ? `<p class="reste-auj ${depasseAuj ? 'alerte' : ''}">
        ${depasseAuj ? icon('arrow-up', 14) : icon('check', 14)}
        Aujourd'hui : ${formater(r.depenseAujourdhui, dp)} dépensés${depasseAuj ? ', au-dessus du rythme' : ''}
      </p>` : ''}
    </section>

    <section class="carte carte-mois">
      <a class="mois-col" href="#/operations?type=revenu">
        <span class="etiquette">${icon('arrow-down', 14)} Reçu ce mois</span>
        <span class="mois-chiffre pos">${formater(mois.entrees, dp)}</span>
      </a>
      <a class="mois-col" href="#/operations?type=depense">
        <span class="etiquette">${icon('arrow-up', 14)} Dépensé ce mois</span>
        <span class="mois-chiffre">${formater(mois.sorties, dp)}</span>
      </a>
    </section>

    ${budgets.length ? `
      <section class="carte">
        <div class="carte-tete"><h2>Budgets du mois</h2><a class="btn-lien" href="#/analyse">Tout voir</a></div>
        ${jauges(budgets)}
      </section>` : ''}

    <section class="carte">
      <div class="carte-tete"><h2>Dernières opérations</h2>${recentes.length ? '<a class="btn-lien" href="#/operations">Tout voir</a>' : ''}</div>
      ${recentes.length
        ? `<div class="liste">${recentes.map(ligneOperation).join('')}</div>`
        : vide('receipt', 'Aucune opération', 'Ajoutez votre première dépense avec le bouton +.')}
    </section>
  `;
}
