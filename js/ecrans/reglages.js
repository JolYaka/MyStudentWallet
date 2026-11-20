// Réglages : devise, comptes, catégories, opérations récurrentes, taux de
// change, sauvegarde des données, installation de l'app.

import {
  etat, enregistrer, supprimer, majReglages, restaurer, nouvelId, compte, categorie,
  comptesActifs, categoriesDe, soldeCompte, estUtilise, aujourdhui, prochaineEcheance,
  taux, montantPrincipal, executerRecurrences,
} from '../store.js';
import { majTaux } from '../rates.js';
import {
  formater, versUnites, versTexte, symbole, convertir, tauxCroise, DEVISES_COURANTES, decimales,
} from '../money.js';
import {
  esc, ouvrirFeuille, fermerFeuille, confirmer, toast, telecharger, dateCourte, $, $$,
} from '../ui.js';
import { icon, ICONS } from '../icons.js';
import { TABLES } from '../db.js';
import { installer, peutInstaller, estInstallee, consigneInstallation } from '../installation.js';
import {
  verrouActif, empreinteActive, empreintePossible, definirCode, verifierCode, desactiverVerrou,
  activerEmpreinte, desactiverEmpreinte, clavierCode,
} from '../verrou.js';

const ICONES_COMPTE = ['wallet', 'banknote', 'credit-card', 'smartphone', 'landmark', 'piggy-bank', 'hand-coins'];
const ICONES_CATEGORIE = Object.keys(ICONS).filter((n) => ![
  'house', 'list-ordered', 'plus', 'settings', 'search', 'x', 'trash-2', 'chevron-left', 'chevron-right',
  'chevron-down', 'download', 'upload', 'moon', 'sun', 'check', 'pencil', 'refresh-cw', 'sun-moon',
  'arrow-up', 'arrow-down', 'share', 'chart-column', 'arrow-left-right', 'repeat', 'calendar', 'target',
  'lock', 'lock-open', 'fingerprint', 'delete', 'shield-check',
].includes(n)).concat(['house']);

export const VERSION = '2.1.0';

function optionsDevises(choisie) {
  const liste = [...DEVISES_COURANTES];
  if (!liste.some(([c]) => c === choisie)) liste.push([choisie, choisie]);
  return liste.map(([c, n]) => `<option value="${c}" ${c === choisie ? 'selected' : ''}>${c} · ${esc(n)}</option>`).join('');
}

export function rendreReglages() {
  const r = etat.reglages;
  const dp = r.deviseP;
  const ech = prochaineEcheance();
  const devisesUtilisees = [...new Set(etat.comptes.filter((c) => !c.archive).map((c) => c.devise))].filter((d) => d !== dp);
  const archives = etat.comptes.filter((c) => c.archive);

  return `
    <header class="tete-ecran"><h1>Réglages</h1></header>

    <section class="groupe">
      <h2 class="groupe-titre">Général</h2>
      <div class="carte liste">
        <label class="ligne-reglage ligne-select">
          <span class="pastille">${icon('banknote', 18)}</span>
          <span class="lr-nom">Devise principale<span class="lr-sous">Les totaux sont convertis dans cette devise</span></span>
          <span class="lr-valeur">${esc(dp)} ${icon('chevron-down', 16)}</span>
          <select data-devise-p aria-label="Devise principale">${optionsDevises(dp)}</select>
        </label>
        <button class="ligne-reglage" data-rentree id="rentree">
          <span class="pastille">${icon('calendar', 18)}</span>
          <span class="lr-nom">Prochaine rentrée d'argent<span class="lr-sous">${
            ech.source === 'manuelle' ? 'Date choisie' : ech.source === 'recurrence' ? 'Déduite de vos revenus récurrents' : 'Par défaut : fin du mois'}</span></span>
          <span class="lr-valeur">${esc(dateCourte(ech.date))}</span>
        </button>
        <div class="ligne-reglage">
          <span class="pastille">${icon('sun-moon', 18)}</span>
          <span class="lr-nom">Thème</span>
          <div class="segment segment-petit">
            ${[['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']].map(([v, l]) => `
              <button aria-pressed="${r.theme === v}" data-theme="${v}">${l}</button>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="groupe">
      <h2 class="groupe-titre">Comptes</h2>
      <div class="carte liste">
        ${comptesActifs().map((c) => `
          <button class="ligne-reglage" data-compte="${c.id}">
            <span class="pastille">${icon(c.icone, 18)}</span>
            <span class="lr-nom">${esc(c.nom)}<span class="lr-sous">${esc(c.devise)}</span></span>
            <span class="lr-valeur">${formater(soldeCompte(c), c.devise)}</span>
          </button>`).join('')}
        <button class="ligne-reglage ajout" data-compte="">
          <span class="pastille">${icon('plus', 18)}</span><span class="lr-nom">Ajouter un compte</span>
        </button>
      </div>
      ${archives.length ? `<p class="texte-doux note-groupe">${archives.length} compte${archives.length > 1 ? 's' : ''} archivé${archives.length > 1 ? 's' : ''} : ${archives.map((c) => `<button class="btn-lien" data-compte="${c.id}">${esc(c.nom)}</button>`).join(', ')}</p>` : ''}
    </section>

    <section class="groupe">
      <h2 class="groupe-titre">Catégories</h2>
      <div class="carte liste">
        ${['depense', 'revenu'].map((t) => `
          <button class="ligne-reglage" data-categories="${t}">
            <span class="pastille">${icon(t === 'depense' ? 'arrow-up' : 'arrow-down', 18)}</span>
            <span class="lr-nom">${t === 'depense' ? 'Catégories de dépenses' : 'Catégories de revenus'}</span>
            <span class="lr-valeur">${categoriesDe(t).length} ${icon('chevron-right', 16)}</span>
          </button>`).join('')}
      </div>
    </section>

    <section class="groupe">
      <h2 class="groupe-titre">Opérations récurrentes</h2>
      <div class="carte liste">
        ${etat.recurrences.map((rec) => {
          const c = compte(rec.compteId);
          const k = categorie(rec.categorieId);
          return `
          <button class="ligne-reglage ${rec.active ? '' : 'eteint'}" data-recurrence="${rec.id}">
            <span class="pastille ${rec.type}">${icon(k?.icone || 'repeat', 18)}</span>
            <span class="lr-nom">${esc(rec.note || k?.nom || 'Opération')}<span class="lr-sous">${
              rec.active ? `${{ hebdo: 'Chaque semaine', mensuel: 'Chaque mois', annuel: 'Chaque année' }[rec.frequence]}, prochaine le ${esc(dateCourte(rec.prochaine))}` : 'En pause'}</span></span>
            <span class="lr-valeur ${rec.type === 'revenu' ? 'pos' : ''}">${formater((rec.type === 'revenu' ? 1 : -1) * rec.montant, c?.devise || dp, { signe: true })}</span>
          </button>`;
        }).join('')}
        <button class="ligne-reglage ajout" data-recurrence="">
          <span class="pastille">${icon('plus', 18)}</span>
          <span class="lr-nom">Ajouter une récurrence<span class="lr-sous">Loyer, forfait, bourse : créés automatiquement à la date prévue</span></span>
        </button>
      </div>
    </section>

    <section class="groupe">
      <h2 class="groupe-titre">Taux de change</h2>
      <div class="carte liste">
        ${devisesUtilisees.length ? devisesUtilisees.map((d) => {
          const [a, z, t] = sensLisible(d, dp, taux());
          const manuel = r.tauxManuels[d] != null;
          return `
          <button class="ligne-reglage" data-taux="${d}">
            <span class="pastille">${icon('arrow-left-right', 18)}</span>
            <span class="lr-nom">1 ${esc(symbole(a))} = ${t ? esc(t.toLocaleString('fr-FR', { maximumSignificantDigits: 5 })) : '?'} ${esc(symbole(z))}<span class="lr-sous">${manuel ? 'Taux saisi à la main' : 'Taux du marché'}</span></span>
            <span class="lr-valeur">${icon('pencil', 16)}</span>
          </button>`;
        }).join('') : `<p class="ligne-reglage texte-doux">Tous vos comptes sont en ${esc(dp)} : aucune conversion nécessaire.</p>`}
        <button class="ligne-reglage" data-maj-taux>
          <span class="pastille">${icon('refresh-cw', 18)}</span>
          <span class="lr-nom">Mettre à jour les taux<span class="lr-sous">${r.tauxMaj
            ? `Dernière mise à jour : ${esc(new Date(r.tauxMaj).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))}`
            : 'Taux approximatifs intégrés, jamais mis à jour'}</span></span>
        </button>
      </div>
    </section>

    <section class="groupe">
      <h2 class="groupe-titre">Sécurité</h2>
      <div class="carte liste">
        ${verrouActif() ? `
          <button class="ligne-reglage" data-changer-code>
            <span class="pastille">${icon('lock', 18)}</span>
            <span class="lr-nom">Changer le code<span class="lr-sous">L'app se verrouille après 30 s en arrière-plan</span></span>
          </button>
          <button class="ligne-reglage" data-empreinte hidden>
            <span class="pastille">${icon('fingerprint', 18)}</span>
            <span class="lr-nom">Déverrouiller avec l'empreinte</span>
            <span class="lr-valeur">${empreinteActive() ? 'Activé' : 'Désactivé'}</span>
          </button>
          <button class="ligne-reglage" data-retirer-code>
            <span class="pastille">${icon('lock-open', 18)}</span>
            <span class="lr-nom">Retirer le verrouillage</span>
          </button>` : `
          <button class="ligne-reglage" data-poser-code>
            <span class="pastille">${icon('lock', 18)}</span>
            <span class="lr-nom">Verrouiller l'app<span class="lr-sous">Par un code à 4 chiffres, et l'empreinte si le téléphone le permet</span></span>
          </button>`}
      </div>
    </section>

    <section class="groupe">
      <h2 class="groupe-titre">Données</h2>
      <p class="texte-doux note-groupe">Vos données restent sur ce téléphone. Faites une sauvegarde de temps en temps : si vous effacez les données du navigateur, elles disparaissent.</p>
      <div class="carte liste">
        <button class="ligne-reglage" data-sauver>
          <span class="pastille">${icon('download', 18)}</span>
          <span class="lr-nom">Sauvegarder<span class="lr-sous">Un fichier .json à garder en lieu sûr</span></span>
        </button>
        <label class="ligne-reglage">
          <span class="pastille">${icon('upload', 18)}</span>
          <span class="lr-nom">Restaurer une sauvegarde<span class="lr-sous">Remplace les données actuelles</span></span>
          <input type="file" accept=".json,application/json" data-restaurer class="sr">
        </label>
        <button class="ligne-reglage" data-csv>
          <span class="pastille">${icon('share', 18)}</span>
          <span class="lr-nom">Exporter en CSV<span class="lr-sous">Pour Excel ou Google Sheets</span></span>
        </button>
        <button class="ligne-reglage danger" data-effacer>
          <span class="pastille">${icon('trash-2', 18)}</span>
          <span class="lr-nom">Effacer toutes les données</span>
        </button>
      </div>
    </section>

    ${estInstallee() ? '' : `
      <section class="groupe">
        <h2 class="groupe-titre">Application</h2>
        <div class="carte liste">
          <button class="ligne-reglage" data-installer>
            <span class="pastille">${icon('smartphone', 18)}</span>
            <span class="lr-nom">Installer sur ce téléphone<span class="lr-sous">S'ouvre comme une app, fonctionne sans connexion</span></span>
          </button>
        </div>
      </section>`}

    <p class="pied-page texte-doux">MyStudentWallet ${VERSION}</p>
  `;
}

export function brancherReglages(racine, params) {
  $('[data-devise-p]', racine).onchange = (e) => changerDeviseP(e.target.value);
  $$('[data-theme]', racine).forEach((b) => b.onclick = () => majReglages({ theme: b.dataset.theme }));
  $('[data-rentree]', racine).onclick = ouvrirRentree;
  $$('[data-compte]', racine).forEach((b) => b.onclick = () => ouvrirCompte(b.dataset.compte));
  $$('[data-categories]', racine).forEach((b) => b.onclick = () => ouvrirCategories(b.dataset.categories));
  $$('[data-recurrence]', racine).forEach((b) => b.onclick = () => ouvrirRecurrence(b.dataset.recurrence));
  $$('[data-taux]', racine).forEach((b) => b.onclick = () => ouvrirTaux(b.dataset.taux));
  $('[data-maj-taux]', racine).onclick = async () => {
    toast('Mise à jour des taux...');
    const res = await majTaux({ forcer: true });
    toast({ ok: 'Taux mis à jour', 'hors-ligne': 'Pas de connexion : les derniers taux connus sont conservés.', echec: 'La mise à jour a échoué. Réessayez plus tard.' }[res] || 'Taux à jour');
  };
  $('[data-sauver]', racine).onclick = sauvegarder;
  $('[data-restaurer]', racine).onchange = (e) => restaurerFichier(e.target.files[0]);
  $('[data-csv]', racine).onclick = exporterCSV;
  $('[data-effacer]', racine).onclick = toutEffacer;
  $('[data-installer]', racine)?.addEventListener('click', proposerInstallation);
  $('[data-poser-code]', racine)?.addEventListener('click', () => poserCode());
  $('[data-changer-code]', racine)?.addEventListener('click', () => demanderCodeActuel('Changer le code', () => poserCode(true)));
  $('[data-retirer-code]', racine)?.addEventListener('click', () => demanderCodeActuel('Retirer le verrouillage', async () => {
    await desactiverVerrou();
    toast('Verrouillage retiré');
  }));
  const ligneEmpreinte = $('[data-empreinte]', racine);
  if (ligneEmpreinte) {
    empreintePossible().then((oui) => { ligneEmpreinte.hidden = !oui; });
    ligneEmpreinte.onclick = async () => {
      if (empreinteActive()) { await desactiverEmpreinte(); toast('Empreinte désactivée'); return; }
      proposerEmpreinte();
    };
  }
  if (params.get('section')) setTimeout(() => document.getElementById(params.get('section'))?.scrollIntoView({ block: 'center' }), 50);
}

// ---- Devise principale --------------------------------------------------------

async function changerDeviseP(nouvelle) {
  const ancienne = etat.reglages.deviseP;
  if (nouvelle === ancienne) return;
  // Les budgets sont exprimés dans la devise principale : on les convertit.
  for (const k of etat.categories) {
    if (k.budget) {
      const v = convertir(k.budget, ancienne, nouvelle, taux());
      await enregistrer('categories', { ...k, budget: v }, false);
    }
  }
  await majReglages({ deviseP: nouvelle });
  toast(`Totaux affichés en ${nouvelle}`);
}

// ---- Prochaine rentrée -----------------------------------------------------------

function ouvrirRentree() {
  const r = etat.reglages;
  const f = ouvrirFeuille({
    titre: "Prochaine rentrée d'argent",
    contenu: `
      <p class="texte-doux">Le « reste par jour » de l'accueil divise ce qu'il vous reste par le nombre de jours jusqu'à cette date.
      Sans date choisie, l'app prend votre prochain revenu récurrent, ou à défaut la fin du mois.</p>
      <label class="champ"><span class="champ-titre">Date</span>
        <input type="date" class="entree" id="date-rentree" min="${aujourdhui()}" value="${esc(r.prochaineRentree && r.prochaineRentree > aujourdhui() ? r.prochaineRentree : '')}"></label>`,
    pied: `<button class="btn btn-second" data-auto>Automatique</button><button class="btn btn-prim" data-ok>Enregistrer</button>`,
  });
  $('[data-auto]', f).onclick = async () => { await majReglages({ prochaineRentree: null }); fermerFeuille(); };
  $('[data-ok]', f).onclick = async () => {
    const v = $('#date-rentree', f).value;
    await majReglages({ prochaineRentree: v || null });
    fermerFeuille();
  };
}

// ---- Comptes -----------------------------------------------------------------------

function ouvrirCompte(id) {
  const existant = id ? compte(id) : null;
  const c = existant ? { ...existant } : {
    id: nouvelId(), nom: '', devise: etat.reglages.deviseP, icone: 'wallet', soldeInitial: 0,
    ordre: etat.comptes.length, archive: false,
  };
  const utilise = existant && estUtilise('compteId', existant.id);
  const soldeActuel = existant ? soldeCompte(existant) : 0;

  const f = ouvrirFeuille({
    titre: existant ? 'Modifier le compte' : 'Nouveau compte',
    contenu: `
      <label class="champ"><span class="champ-titre">Nom</span>
        <input class="entree" id="c-nom" maxlength="30" value="${esc(c.nom)}" placeholder="Ex. Espèces, Carte, Orange Money"></label>
      <label class="champ"><span class="champ-titre">Devise</span>
        <select class="entree" id="c-devise" ${utilise ? 'disabled' : ''}>${optionsDevises(c.devise)}</select>
        ${utilise ? '<span class="texte-doux petit">La devise ne change plus une fois le compte utilisé : créez un autre compte.</span>' : ''}</label>
      <label class="champ"><span class="champ-titre">${existant ? 'Solde actuel' : 'Solde de départ'}</span>
        <input class="entree" id="c-solde" inputmode="decimal" value="${esc(versTexte(soldeActuel, c.devise))}">
        ${existant ? '<span class="texte-doux petit">Corrigez-le si l\'app ne correspond plus à la réalité.</span>' : ''}</label>
      <div class="champ"><span class="champ-titre">Icône</span>
        <div class="choix-icones">${ICONES_COMPTE.map((n) => `
          <button class="choix-icone" aria-pressed="${n === c.icone}" data-icone="${n}" aria-label="${n}">${icon(n, 20)}</button>`).join('')}</div></div>
      <p class="erreur" id="erreur" role="alert"></p>`,
    pied: `${existant ? `<button class="btn btn-second" data-suppr>${existant.archive ? 'Réactiver' : utilise ? 'Archiver' : 'Supprimer'}</button>` : ''}
           <button class="btn btn-prim" data-ok>${existant ? 'Enregistrer' : 'Créer le compte'}</button>`,
  });
  $$('[data-icone]', f).forEach((b) => b.onclick = () => {
    c.icone = b.dataset.icone;
    $$('[data-icone]', f).forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('[data-ok]', f).onclick = async () => {
    c.nom = $('#c-nom', f).value.trim();
    if (!utilise) c.devise = $('#c-devise', f).value;
    const solde = versUnites($('#c-solde', f).value.replace(/^-/, ''), c.devise);
    const negatif = $('#c-solde', f).value.trim().startsWith('-');
    if (!c.nom) { $('#erreur', f).textContent = 'Donnez un nom au compte.'; return; }
    if (solde == null) { $('#erreur', f).textContent = 'Le solde doit être un nombre.'; return; }
    const voulu = negatif ? -solde : solde;
    // On corrige le solde de départ pour que le solde actuel soit celui saisi.
    c.soldeInitial = existant ? (existant.soldeInitial || 0) + (voulu - soldeActuel) : voulu;
    await enregistrer('comptes', c);
    fermerFeuille();
    toast(existant ? 'Compte modifié' : 'Compte créé');
  };
  $('[data-suppr]', f)?.addEventListener('click', async () => {
    if (existant.archive) {
      await enregistrer('comptes', { ...existant, archive: false });
      fermerFeuille();
      return;
    }
    if (comptesActifs().length <= 1) { $('#erreur', f).textContent = 'Il faut garder au moins un compte actif.'; return; }
    if (utilise) {
      await enregistrer('comptes', { ...existant, archive: true });
      fermerFeuille();
      toast('Compte archivé : son historique est conservé');
    } else {
      await supprimer('comptes', existant.id);
      fermerFeuille();
      toast('Compte supprimé');
    }
  });
}

// ---- Catégories -----------------------------------------------------------------

function ouvrirCategories(type) {
  const f = ouvrirFeuille({
    titre: type === 'depense' ? 'Catégories de dépenses' : 'Catégories de revenus',
    contenu: `<div class="liste-reglages">
      ${categoriesDe(type).map((k) => `
        <button class="ligne-reglage" data-cat="${k.id}">
          <span class="pastille">${icon(k.icone, 18)}</span>
          <span class="lr-nom">${esc(k.nom)}${k.budget ? `<span class="lr-sous">Budget ${formater(k.budget, etat.reglages.deviseP)} / mois</span>` : ''}</span>
          <span class="lr-valeur">${icon('pencil', 16)}</span>
        </button>`).join('')}
      <button class="ligne-reglage ajout" data-cat="">
        <span class="pastille">${icon('plus', 18)}</span><span class="lr-nom">Nouvelle catégorie</span>
      </button></div>`,
  });
  $$('[data-cat]', f).forEach((b) => b.onclick = () => ouvrirCategorie(b.dataset.cat, type));
}

function ouvrirCategorie(id, type) {
  const existante = id ? categorie(id) : null;
  const dp = etat.reglages.deviseP;
  const k = existante ? { ...existante } : {
    id: nouvelId(), type, nom: '', icone: 'circle-ellipsis', budget: null,
    ordre: etat.categories.length, archive: false,
  };
  const f = ouvrirFeuille({
    titre: existante ? 'Modifier la catégorie' : 'Nouvelle catégorie',
    contenu: `
      <label class="champ"><span class="champ-titre">Nom</span>
        <input class="entree" id="k-nom" maxlength="28" value="${esc(k.nom)}"></label>
      ${type === 'depense' ? `<label class="champ"><span class="champ-titre">Budget mensuel en ${esc(symbole(dp))} <span class="texte-doux">(facultatif)</span></span>
        <input class="entree" id="k-budget" inputmode="decimal" value="${k.budget ? esc(versTexte(k.budget, dp)) : ''}" placeholder="Aucun"></label>` : ''}
      <div class="champ"><span class="champ-titre">Icône</span>
        <div class="choix-icones">${ICONES_CATEGORIE.map((n) => `
          <button class="choix-icone" aria-pressed="${n === k.icone}" data-icone="${n}" aria-label="${n}">${icon(n, 20)}</button>`).join('')}</div></div>
      <p class="erreur" id="erreur" role="alert"></p>`,
    pied: `${existante ? '<button class="btn btn-second" data-suppr>Supprimer</button>' : ''}
           <button class="btn btn-prim" data-ok>${existante ? 'Enregistrer' : 'Créer'}</button>`,
  });
  $$('[data-icone]', f).forEach((b) => b.onclick = () => {
    k.icone = b.dataset.icone;
    $$('[data-icone]', f).forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('[data-ok]', f).onclick = async () => {
    k.nom = $('#k-nom', f).value.trim();
    if (!k.nom) { $('#erreur', f).textContent = 'Donnez un nom à la catégorie.'; return; }
    const champB = $('#k-budget', f);
    if (champB) k.budget = champB.value.trim() ? versUnites(champB.value, dp) : null;
    await enregistrer('categories', k);
    fermerFeuille();
    toast(existante ? 'Catégorie modifiée' : 'Catégorie créée');
  };
  $('[data-suppr]', f)?.addEventListener('click', async () => {
    if (categoriesDe(type).length <= 1) { $('#erreur', f).textContent = 'Il faut garder au moins une catégorie.'; return; }
    if (estUtilise('categorieId', existante.id)) {
      await enregistrer('categories', { ...existante, archive: true });
    } else {
      await supprimer('categories', existante.id);
    }
    fermerFeuille();
    toast('Catégorie supprimée');
  });
}

// ---- Récurrences ---------------------------------------------------------------

function ouvrirRecurrence(id) {
  const existante = id ? etat.recurrences.find((r) => r.id === id) : null;
  const rec = existante ? { ...existante } : {
    id: nouvelId(), type: 'depense', montant: null, compteId: comptesActifs()[0]?.id,
    categorieId: null, note: '', frequence: 'mensuel', prochaine: aujourdhui(), active: true,
  };
  const f = ouvrirFeuille({ titre: existante ? 'Modifier la récurrence' : 'Nouvelle récurrence', contenu: '<div id="rec"></div>',
    pied: `${existante ? '<button class="btn btn-second" data-suppr>Supprimer</button>' : ''}
           <button class="btn btn-prim" data-ok>${existante ? 'Enregistrer' : 'Créer'}</button>` });
  const zone = $('#rec', f);

  const lire = () => {
    const c = compte(rec.compteId);
    rec.montant = versUnites($('#r-montant', zone).value, c.devise);
    rec.note = $('#r-note', zone).value.trim();
    rec.prochaine = $('#r-date', zone).value || rec.prochaine;
  };

  function dessiner() {
    const c = compte(rec.compteId);
    const cats = categoriesDe(rec.type);
    zone.innerHTML = `
      <div class="segment">${[['depense', 'Dépense'], ['revenu', 'Revenu']].map(([v, l]) => `
        <button aria-selected="${rec.type === v}" data-type="${v}">${l}</button>`).join('')}</div>
      <label class="champ"><span class="champ-titre">Nom</span>
        <input class="entree" id="r-note" maxlength="40" value="${esc(rec.note)}" placeholder="${rec.type === 'revenu' ? 'Ex. Bourse' : 'Ex. Loyer'}"></label>
      <label class="champ"><span class="champ-titre">Montant en ${esc(symbole(c.devise))}</span>
        <input class="entree" id="r-montant" inputmode="decimal" value="${rec.montant ? esc(versTexte(rec.montant, c.devise)) : ''}"></label>
      <div class="champ"><span class="champ-titre">Catégorie</span>
        <select class="entree" id="r-cat">${cats.map((k) => `<option value="${k.id}" ${k.id === rec.categorieId ? 'selected' : ''}>${esc(k.nom)}</option>`).join('')}</select></div>
      <div class="champ"><span class="champ-titre">Compte</span>
        <select class="entree" id="r-compte">${comptesActifs().map((x) => `<option value="${x.id}" ${x.id === rec.compteId ? 'selected' : ''}>${esc(x.nom)} (${x.devise})</option>`).join('')}</select></div>
      <div class="champ"><span class="champ-titre">Fréquence</span>
        <div class="puces">${[['hebdo', 'Chaque semaine'], ['mensuel', 'Chaque mois'], ['annuel', 'Chaque année']].map(([v, l]) => `
          <button class="puce" aria-pressed="${rec.frequence === v}" data-freq="${v}">${l}</button>`).join('')}</div></div>
      <label class="champ"><span class="champ-titre">Prochaine date</span>
        <input type="date" class="entree" id="r-date" value="${esc(rec.prochaine)}"></label>
      ${existante ? `<label class="interrupteur"><input type="checkbox" id="r-active" ${rec.active ? 'checked' : ''}><span>Active</span></label>` : ''}
      <p class="erreur" id="erreur" role="alert"></p>`;
    if (!rec.categorieId || !cats.some((k) => k.id === rec.categorieId)) rec.categorieId = cats[0]?.id;
    $$('[data-type]', zone).forEach((b) => b.onclick = () => { lire(); rec.type = b.dataset.type; rec.categorieId = null; dessiner(); });
    $$('[data-freq]', zone).forEach((b) => b.onclick = () => {
      rec.frequence = b.dataset.freq;
      $$('[data-freq]', zone).forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    $('#r-cat', zone).onchange = (e) => { rec.categorieId = e.target.value; };
    $('#r-compte', zone).onchange = (e) => { lire(); rec.compteId = e.target.value; dessiner(); };
  }

  $('[data-ok]', f).onclick = async () => {
    lire();
    const err = $('#erreur', zone);
    if (!rec.montant) { err.textContent = 'Saisissez un montant supérieur à zéro.'; return; }
    if (!rec.categorieId) { err.textContent = 'Choisissez une catégorie.'; return; }
    const a = $('#r-active', zone);
    if (a) rec.active = a.checked;
    await enregistrer('recurrences', rec);
    fermerFeuille();
    const n = await executerRecurrences();
    toast(n ? `Récurrence enregistrée, ${n} opération${n > 1 ? 's' : ''} créée${n > 1 ? 's' : ''}` : 'Récurrence enregistrée');
  };
  $('[data-suppr]', f)?.addEventListener('click', async () => {
    await supprimer('recurrences', existante.id);
    fermerFeuille();
    toast('Récurrence supprimée. Les opérations déjà créées sont conservées.');
  });
  dessiner();
}

// ---- Taux saisi à la main -----------------------------------------------------------

// Affiche un taux dans le sens où il donne un nombre supérieur à 1 :
// « 1 DT = 195,5 FCFA » plutôt que « 1 FCFA = 0,0051 DT ».
function sensLisible(devise, dp, t) {
  const v = tauxCroise(devise, dp, t);
  if (v == null) return [devise, dp, null];
  return v >= 1 ? [devise, dp, v] : [dp, devise, 1 / v];
}

function ouvrirTaux(devise) {
  const dp = etat.reglages.deviseP;
  const [a, z, marche] = sensLisible(devise, dp, { ...etat.reglages.taux });
  const actuel = tauxCroise(a, z, taux());
  const f = ouvrirFeuille({
    titre: `Taux ${a} vers ${z}`,
    contenu: `
      <p class="texte-doux">Taux du marché : 1 ${esc(symbole(a))} = ${marche ? esc(marche.toLocaleString('fr-FR', { maximumSignificantDigits: 6 })) : '?'} ${esc(symbole(z))}.
      Si votre bureau de change applique un autre taux, saisissez-le : il remplacera celui du marché.</p>
      <label class="champ"><span class="champ-titre">1 ${esc(symbole(a))} = ? ${esc(symbole(z))}</span>
        <input class="entree" id="t-val" inputmode="decimal" value="${actuel ? esc(String(+actuel.toPrecision(6)).replace('.', ',')) : ''}"></label>`,
    pied: `<button class="btn btn-second" data-marche>Taux du marché</button><button class="btn btn-prim" data-ok>Enregistrer</button>`,
  });
  $('[data-marche]', f).onclick = async () => {
    const m = { ...etat.reglages.tauxManuels };
    delete m[devise];
    await majReglages({ tauxManuels: m });
    fermerFeuille();
  };
  $('[data-ok]', f).onclick = async () => {
    const v = parseFloat($('#t-val', f).value.replace(',', '.'));
    if (!(v > 0)) return;
    // Les taux sont stockés par rapport à l'euro (1 EUR = X devise).
    // Saisi : 1 a = v z. On en déduit le taux de « devise » par rapport à l'euro.
    const t = taux();
    const parEuro = devise === z ? t[a] * v : t[z] / v;
    await majReglages({ tauxManuels: { ...etat.reglages.tauxManuels, [devise]: parEuro } });
    fermerFeuille();
    toast('Taux enregistré');
  };
}

// ---- Sauvegarde, restauration, export ------------------------------------------------

function horodatage() {
  return aujourdhui();
}

function sauvegarder() {
  const donnees = { app: 'MyStudentWallet', version: 1, exporteLe: new Date().toISOString() };
  for (const t of TABLES) donnees[t] = t === 'reglages' ? [etat.reglages] : etat[t];
  telecharger(`mystudentwallet-${horodatage()}.json`, JSON.stringify(donnees, null, 1), 'application/json');
  toast('Sauvegarde téléchargée');
}

async function restaurerFichier(fichier) {
  if (!fichier) return;
  let donnees;
  try {
    donnees = JSON.parse(await fichier.text());
    if (donnees.app !== 'MyStudentWallet' || !Array.isArray(donnees.operations)) throw new Error();
  } catch {
    toast("Ce fichier n'est pas une sauvegarde MyStudentWallet.");
    return;
  }
  const ok = await confirmer({
    titre: 'Restaurer cette sauvegarde ?',
    texte: `${donnees.operations.length} opérations et ${donnees.comptes.length} comptes remplaceront les données actuelles.`,
    action: 'Restaurer',
  });
  if (!ok) return;
  await restaurer(donnees);
  toast('Sauvegarde restaurée');
}

function exporterCSV() {
  const dp = etat.reglages.deviseP;
  const cel = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const nombre = (u, d) => (u / 10 ** decimales(d)).toFixed(decimales(d)).replace('.', ',');
  const lignes = [['Date', 'Type', 'Montant', 'Devise', 'Compte', 'Catégorie ou destination', 'Note', `Montant en ${dp}`]];
  const ops = [...etat.operations].sort((a, b) => a.date.localeCompare(b.date));
  for (const o of ops) {
    const c = compte(o.compteId);
    const signe = o.type === 'depense' ? -1 : 1;
    lignes.push([
      o.date,
      { depense: 'Dépense', revenu: 'Revenu', virement: 'Virement' }[o.type],
      nombre(signe * o.montant, c.devise),
      c.devise,
      c.nom,
      o.type === 'virement' ? compte(o.versCompteId)?.nom : categorie(o.categorieId)?.nom,
      o.note,
      o.type === 'virement' ? '' : nombre(signe * montantPrincipal(o), dp),
    ]);
  }
  // Le BOM (﻿) et le point-virgule font qu'Excel en français ouvre le
  // fichier correctement, accents compris.
  telecharger(`mystudentwallet-${horodatage()}.csv`, '﻿' + lignes.map((l) => l.map(cel).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  toast(`${ops.length} opérations exportées`);
}

async function toutEffacer() {
  const ok = await confirmer({
    titre: 'Effacer toutes les données ?',
    texte: 'Comptes, opérations, catégories et réglages seront supprimés de ce téléphone. Faites une sauvegarde avant si vous voulez les garder.',
    action: 'Tout effacer',
  });
  if (!ok) return;
  await restaurer({});
  location.hash = '#/accueil';
}

function proposerInstallation() {
  if (peutInstaller()) { installer(); return; }
  const etapes = consigneInstallation();
  ouvrirFeuille({
    titre: 'Installer MyStudentWallet',
    contenu: `<ol class="etapes">${etapes.map((e) => `<li>${e}</li>`).join('')}</ol>`,
  });
}

// ---- Verrouillage ------------------------------------------------------------------------

// Choix du code en deux temps : saisie, puis confirmation.
function poserCode(changement = false) {
  const f = ouvrirFeuille({ titre: changement ? 'Nouveau code' : "Verrouiller l'app", contenu: '<div id="pave-reglage"></div>' });
  let premier = null;
  clavierCode($('#pave-reglage', f), {
    titre: 'Choisissez un code à 4 chiffres',
    sousTitre: "Il sera demandé à chaque ouverture de l'app.",
    onCode: async (code, api) => {
      if (!premier) {
        premier = code;
        api.vider();
        api.message('Saisissez-le une seconde fois pour confirmer.');
        return;
      }
      if (code !== premier) {
        premier = null;
        api.secouer();
        api.message('Les deux codes ne correspondent pas. Recommencez.', true);
        return;
      }
      await definirCode(code);
      fermerFeuille();
      toast(changement ? 'Code modifié' : 'Verrouillage activé');
      if (!changement && await empreintePossible()) setTimeout(proposerEmpreinte, 300);
    },
  });
}

function demanderCodeActuel(titre, suite) {
  const f = ouvrirFeuille({ titre, contenu: '<div id="pave-reglage"></div>' });
  clavierCode($('#pave-reglage', f), {
    titre: 'Saisissez votre code actuel',
    onCode: async (code, api) => {
      if (!(await verifierCode(code))) { api.secouer(); api.message('Code incorrect', true); return; }
      fermerFeuille();
      setTimeout(suite, 250);
    },
  });
}

function proposerEmpreinte() {
  const f = ouvrirFeuille({
    titre: "Déverrouiller avec l'empreinte",
    contenu: `<p class="texte-doux">Posez votre doigt une fois pour l'enregistrer. Android peut vous proposer de créer une « clé d'accès » : acceptez, c'est le mécanisme qu'il utilise. Votre empreinte ne quitte jamais le téléphone, et le code reste utilisable à tout moment.</p>`,
    pied: '<button class="btn btn-second" data-non>Plus tard</button><button class="btn btn-prim" data-oui>Activer</button>',
  });
  $('[data-non]', f).onclick = () => fermerFeuille();
  $('[data-oui]', f).onclick = async () => {
    try {
      await activerEmpreinte();
      fermerFeuille();
      toast('Empreinte activée');
    } catch {
      toast("L'empreinte n'a pas été enregistrée. Vous pourrez réessayer depuis Réglages.");
    }
  };
}
