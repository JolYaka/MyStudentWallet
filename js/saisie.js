// Feuille d'ajout et de modification d'une opération.
// Pensée pour une saisie en quelques secondes : le montant d'abord, la
// catégorie en un geste, tout le reste a une valeur par défaut raisonnable.

import {
  etat, enregistrer, supprimer, nouvelId, compte, categorie, comptesActifs, categoriesDe,
  aujourdhui, ajouterJours, ajouterMois, taux,
} from './store.js';
import { versUnites, versTexte, symbole, convertir, formater } from './money.js';
import { ouvrirFeuille, fermerFeuille, toast, esc, $, $$ } from './ui.js';
import { icon } from './icons.js';

const LIBELLES = { depense: 'Dépense', revenu: 'Revenu', virement: 'Virement' };

// Dernier compte utilisé, pour le proposer par défaut.
let dernierCompte = null;

export function ouvrirSaisie(existante = null, typeDepart = 'depense') {
  const comptes = comptesActifs();
  if (!comptes.length) {
    toast("Ajoutez d'abord un compte dans Réglages.");
    return;
  }
  const op = existante ? { ...existante } : {
    id: nouvelId(),
    type: typeDepart,
    montant: null,
    compteId: (dernierCompte && compte(dernierCompte) && !compte(dernierCompte).archive) ? dernierCompte : comptes[0].id,
    categorieId: null,
    versCompteId: comptes[1]?.id || null,
    montantArrivee: null,
    note: '',
    date: aujourdhui(),
  };
  let repetition = 'non';
  let arriveeTouchee = existante?.type === 'virement';

  const f = ouvrirFeuille({
    titre: existante ? "Modifier l'opération" : 'Nouvelle opération',
    classe: 'feuille-saisie',
    contenu: '<div id="saisie"></div>',
    pied: `${existante ? `<button class="btn btn-second" data-supprimer>${icon('trash-2', 18)} Supprimer</button>` : ''}
           <button class="btn btn-prim" data-valider></button>`,
  });
  const zone = $('#saisie', f);

  function dessiner() {
    const c = compte(op.compteId);
    const autresComptes = comptesActifs().filter((x) => x.id !== op.compteId);
    if (op.type === 'virement' && (!op.versCompteId || op.versCompteId === op.compteId)) {
      op.versCompteId = autresComptes[0]?.id || null;
    }
    const cVers = compte(op.versCompteId);
    const devisesDiff = op.type === 'virement' && cVers && cVers.devise !== c.devise;
    const cats = op.type === 'virement' ? [] : categoriesDe(op.type);
    if (op.type !== 'virement' && !cats.some((x) => x.id === op.categorieId)) op.categorieId = null;
    const hier = ajouterJours(aujourdhui(), -1);
    const dateAutre = op.date !== aujourdhui() && op.date !== hier;

    zone.innerHTML = `
      <div class="segment" role="tablist" aria-label="Type d'opération">
        ${['depense', 'revenu', 'virement'].map((t) => `
          <button role="tab" aria-selected="${op.type === t}" data-type="${t}">${LIBELLES[t]}</button>`).join('')}
      </div>

      <label class="montant-saisie">
        <span class="sr">Montant</span>
        <input id="montant" inputmode="decimal" autocomplete="off" placeholder="0"
          value="${op.montant != null ? esc(versTexte(op.montant, c.devise)) : ''}">
        <span class="montant-devise">${esc(symbole(c.devise))}</span>
      </label>

      ${op.type === 'virement' ? `
        <div class="champ">
          <span class="champ-titre">Depuis</span>
          <div class="puces" data-groupe="compteId">${puceComptes(comptesActifs(), op.compteId)}</div>
        </div>
        <div class="champ">
          <span class="champ-titre">Vers</span>
          ${autresComptes.length
            ? `<div class="puces" data-groupe="versCompteId">${puceComptes(autresComptes, op.versCompteId)}</div>`
            : '<p class="texte-doux">Il faut un deuxième compte pour faire un virement.</p>'}
        </div>
        ${devisesDiff ? `
          <label class="champ">
            <span class="champ-titre">Montant reçu en ${esc(symbole(cVers.devise))}</span>
            <input id="arrivee" class="entree" inputmode="decimal"
              value="${(() => {
                const v = op.montantArrivee ?? (op.montant ? convertir(op.montant, c.devise, cVers.devise, taux()) : null);
                return v != null ? esc(versTexte(v, cVers.devise)) : '';
              })()}"
              placeholder="Calculé au taux du jour">
          </label>` : ''}
      ` : `
        <div class="champ">
          <span class="champ-titre">Catégorie</span>
          <div class="grille-cat">
            ${cats.map((k) => `
              <button class="cat ${k.id === op.categorieId ? 'choisie' : ''}" data-cat="${k.id}" aria-pressed="${k.id === op.categorieId}">
                <span class="pastille">${icon(k.icone, 20)}</span>
                <span class="cat-nom">${esc(k.nom)}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="champ">
          <span class="champ-titre">Compte</span>
          <div class="puces" data-groupe="compteId">${puceComptes(comptesActifs(), op.compteId)}</div>
        </div>
      `}

      <div class="champ">
        <span class="champ-titre">Date</span>
        <div class="puces">
          <button class="puce" aria-pressed="${op.date === aujourdhui()}" data-date="${aujourdhui()}">Aujourd'hui</button>
          <button class="puce" aria-pressed="${op.date === hier}" data-date="${hier}">Hier</button>
          <label class="puce puce-date" aria-pressed="${dateAutre}">
            ${icon('calendar', 16)}
            <input type="date" id="date-libre" value="${esc(op.date)}" max="${ajouterJours(aujourdhui(), 365)}" aria-label="Autre date">
            <span>${dateAutre ? esc(op.date.split('-').reverse().join('/')) : 'Autre'}</span>
          </label>
        </div>
      </div>

      <label class="champ">
        <span class="champ-titre">Note <span class="texte-doux">(facultatif)</span></span>
        <input id="note" class="entree" maxlength="80" value="${esc(op.note)}" placeholder="${op.type === 'revenu' ? 'Ex. bourse de novembre' : 'Ex. sandwich au resto U'}">
      </label>

      ${!existante && op.type !== 'virement' ? `
        <div class="champ">
          <span class="champ-titre">Répéter</span>
          <div class="puces">
            ${[['non', 'Non'], ['hebdo', 'Chaque semaine'], ['mensuel', 'Chaque mois']].map(([v, l]) => `
              <button class="puce" aria-pressed="${repetition === v}" data-rep="${v}">${l}</button>`).join('')}
          </div>
        </div>` : ''}
      <p class="erreur" id="erreur" role="alert"></p>
    `;
    $('[data-valider]', f).textContent = existante ? 'Enregistrer' :
      op.type === 'depense' ? 'Ajouter la dépense' : op.type === 'revenu' ? 'Ajouter le revenu' : 'Faire le virement';
    brancher();
  }

  function lireMontants() {
    const c = compte(op.compteId);
    op.montant = versUnites($('#montant', zone).value, c.devise);
    const a = $('#arrivee', zone);
    if (a) {
      const cVers = compte(op.versCompteId);
      op.montantArrivee = a.value.trim() ? versUnites(a.value, cVers.devise) : null;
    }
    op.note = $('#note', zone).value.trim();
  }

  function brancher() {
    const champ = $('#montant', zone);
    champ.addEventListener('input', () => {
      champ.value = champ.value.replace(/[^\d.,]/g, '');
      // Au fil de la frappe, propose le montant converti pour un virement
      // entre deux devises, tant que l'utilisateur ne l'a pas modifié lui-même.
      const a = $('#arrivee', zone);
      if (a && !arriveeTouchee) {
        const c = compte(op.compteId);
        const cVers = compte(op.versCompteId);
        const u = versUnites(champ.value, c.devise);
        const conv = u != null ? convertir(u, c.devise, cVers.devise, taux()) : null;
        a.value = conv != null ? versTexte(conv, cVers.devise) : '';
      }
    });
    $('#arrivee', zone)?.addEventListener('input', () => { arriveeTouchee = true; });

    $$('[data-type]', zone).forEach((b) => b.onclick = () => {
      lireMontants();
      op.type = b.dataset.type;
      op.categorieId = null;
      dessiner();
    });
    $$('[data-cat]', zone).forEach((b) => b.onclick = () => {
      op.categorieId = b.dataset.cat;
      $$('[data-cat]', zone).forEach((x) => {
        const oui = x === b;
        x.classList.toggle('choisie', oui);
        x.setAttribute('aria-pressed', oui);
      });
    });
    $$('[data-groupe] [data-compte]', zone).forEach((b) => b.onclick = () => {
      lireMontants();
      op[b.closest('[data-groupe]').dataset.groupe] = b.dataset.compte;
      arriveeTouchee = false;
      op.montantArrivee = null;
      dessiner();
    });
    $$('[data-date]', zone).forEach((b) => b.onclick = () => { lireMontants(); op.date = b.dataset.date; dessiner(); });
    $('#date-libre', zone).onchange = (e) => { if (e.target.value) { lireMontants(); op.date = e.target.value; dessiner(); } };
    $$('[data-rep]', zone).forEach((b) => b.onclick = () => {
      repetition = b.dataset.rep;
      $$('[data-rep]', zone).forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
  }

  async function valider() {
    lireMontants();
    const err = $('#erreur', zone);
    const c = compte(op.compteId);
    if (!op.montant) { err.textContent = 'Saisissez un montant supérieur à zéro.'; $('#montant', zone).focus(); return; }
    if (op.type !== 'virement' && !op.categorieId) { err.textContent = 'Choisissez une catégorie.'; return; }
    if (op.type === 'virement') {
      if (!op.versCompteId) { err.textContent = 'Choisissez le compte qui reçoit le virement.'; return; }
      const cVers = compte(op.versCompteId);
      if (cVers.devise !== c.devise && op.montantArrivee == null) {
        op.montantArrivee = convertir(op.montant, c.devise, cVers.devise, taux());
      }
      if (cVers.devise === c.devise) op.montantArrivee = null;
      op.categorieId = null;
    } else {
      op.versCompteId = null;
      op.montantArrivee = null;
    }
    const nouvelle = !existante;
    const aSauver = { ...op, creeLe: existante?.creeLe || Date.now() };
    if (nouvelle && repetition !== 'non') {
      const rec = {
        id: nouvelId(), type: op.type, montant: op.montant, compteId: op.compteId,
        categorieId: op.categorieId, note: op.note, frequence: repetition, active: true,
        prochaine: repetition === 'hebdo' ? ajouterJours(op.date, 7) : ajouterMois(op.date, 1),
      };
      aSauver.recurrenceId = rec.id;
      await enregistrer('recurrences', rec, false);
    }
    dernierCompte = op.compteId;
    await enregistrer('operations', aSauver);
    fermerFeuille();
    const k = categorie(op.categorieId);
    const quoi = op.type === 'virement' ? 'Virement enregistré' : `${k?.nom || LIBELLES[op.type]} : ${formater(op.montant, c.devise)}`;
    toast(nouvelle ? `${quoi}${repetition !== 'non' ? ', répété' : ''}` : 'Opération modifiée');
  }

  $('[data-valider]', f).onclick = valider;
  $('[data-supprimer]', f)?.addEventListener('click', async () => {
    const ancien = await supprimer('operations', existante.id);
    fermerFeuille();
    toast('Opération supprimée', { action: 'Annuler', onAction: () => enregistrer('operations', ancien) });
  });
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type=date])')) { e.preventDefault(); valider(); }
  });

  dessiner();
  // Focus immédiat (et non différé) : sur téléphone, le clavier ne s'ouvre
  // que si le focus suit directement le geste de l'utilisateur.
  if (!existante) $('#montant', zone)?.focus({ preventScroll: true });
}

function puceComptes(liste, choisi) {
  return liste.map((c) => `
    <button class="puce" aria-pressed="${c.id === choisi}" data-compte="${c.id}">
      ${icon(c.icone, 16)} ${esc(c.nom)} <span class="texte-doux">${esc(symbole(c.devise))}</span>
    </button>`).join('');
}
