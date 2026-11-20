// Morceaux d'affichage réutilisés par plusieurs écrans.

import { etat, compte, categorie, montantPrincipal } from '../store.js';
import { formater } from '../money.js';
import { esc } from '../ui.js';
import { icon } from '../icons.js';

// Une ligne d'opération : icône, libellé, compte, montant.
export function ligneOperation(op) {
  const c = compte(op.compteId);
  const devise = c?.devise || etat.reglages.deviseP;
  let titre;
  let ico;
  let sous;
  if (op.type === 'virement') {
    const v = compte(op.versCompteId);
    titre = op.note || 'Virement';
    ico = 'arrow-left-right';
    sous = `${esc(c?.nom || '?')} vers ${esc(v?.nom || '?')}`;
  } else {
    const k = categorie(op.categorieId);
    titre = op.note || k?.nom || 'Sans catégorie';
    ico = k?.icone || 'circle-ellipsis';
    // La catégorie n'est rappelée que si la note la remplace dans le titre.
    const rappel = op.note && op.note !== k?.nom ? esc(k?.nom || '') : '';
    sous = [rappel, esc(c?.nom || '')].filter(Boolean).join(' · ');
  }
  const signe = op.type === 'revenu' ? 1 : op.type === 'depense' ? -1 : 0;
  const montant = formater(signe * op.montant || op.montant, devise, { signe: signe > 0 });
  const autre = devise !== etat.reglages.deviseP && op.type !== 'virement'
    ? `<span class="ligne-conv">≈ ${formater(montantPrincipal(op), etat.reglages.deviseP)}</span>` : '';
  return `
    <button class="ligne" data-op="${op.id}">
      <span class="pastille ${op.type}">${icon(ico, 18)}</span>
      <span class="ligne-texte">
        <span class="ligne-titre">${esc(titre)}</span>
        <span class="ligne-sous">${sous}${op.recurrenceId ? ` · ${icon('repeat', 12)}` : ''}</span>
      </span>
      <span class="ligne-montant ${op.type}">${montant}${autre}</span>
    </button>`;
}

// Liste de jauges « dépensé / budget » par catégorie.
export function jauges(lignes) {
  const dp = etat.reglages.deviseP;
  return `<ul class="jauges">${lignes.map(({ k, depense, budget }) => {
    const ratio = budget ? depense / budget : 0;
    const etatJauge = ratio > 1 ? 'depasse' : ratio > 0.85 ? 'limite' : '';
    const reste = budget - depense;
    return `
      <li class="jauge ${etatJauge}">
        <div class="jauge-tete">
          <span class="jauge-nom">${icon(k.icone, 16)} ${esc(k.nom)}</span>
          <span class="jauge-chiffre">${formater(depense, dp, { sansSymbole: true })} <span class="texte-doux">/ ${formater(budget, dp)}</span></span>
        </div>
        <div class="jauge-piste" role="meter" aria-valuemin="0" aria-valuemax="${budget}" aria-valuenow="${depense}" aria-label="${esc(k.nom)}">
          <div class="jauge-barre" style="width:${Math.min(100, ratio * 100).toFixed(1)}%"></div>
        </div>
        <span class="jauge-etat">${ratio > 1
          ? `${icon('arrow-up', 12)} Dépassé de ${formater(-reste, dp)}`
          : `Reste ${formater(reste, dp)}`}</span>
      </li>`;
  }).join('')}</ul>`;
}

export function vide(ico, titre, texte, bouton = '') {
  return `<div class="vide">
    <span class="vide-icone">${icon(ico, 28)}</span>
    <p class="vide-titre">${esc(titre)}</p>
    <p class="texte-doux">${esc(texte)}</p>
    ${bouton}
  </div>`;
}
