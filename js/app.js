// Point d'entrée : démarre la base, choisit l'écran selon l'adresse
// (#/accueil, #/operations...), et redessine quand les données changent.

import { etat, demarrer, surChangement, initialiser, restaurer } from './store.js';
import { majTaux } from './rates.js';
import { versUnites, DEVISES_COURANTES } from './money.js';
import { esc, $, $$, toast } from './ui.js';
import { icon } from './icons.js';
import { ouvrirSaisie } from './saisie.js';
import { rendreAccueil } from './ecrans/accueil.js';
import { rendreOperations, brancherOperations } from './ecrans/operations.js';
import { rendreAnalyse, brancherAnalyse } from './ecrans/analyse.js';
import { rendreReglages, brancherReglages } from './ecrans/reglages.js';

const ECRANS = {
  accueil: { rendre: rendreAccueil, titre: 'Accueil', icone: 'house' },
  operations: { rendre: rendreOperations, brancher: brancherOperations, titre: 'Opérations', icone: 'list-ordered' },
  analyse: { rendre: rendreAnalyse, brancher: brancherAnalyse, titre: 'Analyse', icone: 'chart-column' },
  reglages: { rendre: rendreReglages, brancher: brancherReglages, titre: 'Réglages', icone: 'settings' },
};

const app = document.getElementById('app');
let dernierEcran = null;

function lireAdresse() {
  const [chemin, requete = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const nom = ECRANS[chemin] ? chemin : 'accueil';
  return { nom, params: new URLSearchParams(requete) };
}

function appliquerTheme() {
  const t = etat.reglages?.theme || 'auto';
  try { localStorage.setItem('msw-theme', JSON.stringify(t)); } catch { /* facultatif */ }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t === 'sombre' ? 'dark' : 'light';
  const sombre = t === 'sombre' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]').content = sombre ? '#0d0e11' : '#f2f3f5';
}

function dessiner() {
  appliquerTheme();
  if (!etat.reglages.initialise) {
    dessinerAccueilPremierLancement();
    return;
  }
  const { nom, params } = lireAdresse();
  const ecran = ECRANS[nom];
  const memeEcran = dernierEcran === location.hash;
  const defilement = window.scrollY;

  app.innerHTML = `
    <main class="ecran ecran-${nom}" id="contenu">${ecran.rendre(params)}</main>
    <nav class="barre" aria-label="Navigation principale">
      ${navItem('accueil')}${navItem('operations')}
      <button class="fab" data-ajouter aria-label="Ajouter une opération">${icon('plus', 26)}</button>
      ${navItem('analyse')}${navItem('reglages')}
    </nav>`;
  ecran.brancher?.(app, params);
  document.title = `${ecran.titre} · MyStudentWallet`;
  // Même écran redessiné après une modification : on garde la position.
  window.scrollTo(0, memeEcran ? defilement : 0);
  dernierEcran = location.hash;

  function navItem(n) {
    const e = ECRANS[n];
    return `<a href="#/${n}" class="onglet" ${n === nom ? 'aria-current="page"' : ''}>${icon(e.icone, 22)}<span>${e.titre}</span></a>`;
  }
}

// ---- Premier lancement ---------------------------------------------------------

function dessinerAccueilPremierLancement() {
  const options = DEVISES_COURANTES.map(([c, n]) => `<option value="${c}">${c} · ${esc(n)}</option>`).join('');
  app.innerHTML = `
    <main class="bienvenue">
      <div class="bienvenue-haut">
        <img src="assets/icons/icon.svg" width="56" height="56" alt="">
        <h1>MyStudentWallet</h1>
        <p class="texte-doux">Notez vos dépenses en quelques secondes et sachez chaque jour combien vous pouvez encore dépenser.</p>
      </div>
      <form class="carte bienvenue-form" id="debut">
        <label class="champ"><span class="champ-titre">Devise principale</span>
          <select class="entree" name="devise">${options}</select>
          <span class="texte-doux petit">Vous pourrez ajouter des comptes dans d'autres devises.</span></label>
        <label class="champ"><span class="champ-titre">Premier compte</span>
          <input class="entree" name="nom" value="Espèces" maxlength="30" required></label>
        <label class="champ"><span class="champ-titre">Ce qu'il y a dessus aujourd'hui</span>
          <input class="entree" name="solde" inputmode="decimal" placeholder="0" autocomplete="off"></label>
        <p class="erreur" role="alert"></p>
        <button class="btn btn-prim btn-large">Commencer</button>
      </form>
      <label class="btn-lien restaurer-lien">${icon('upload', 16)} Restaurer une sauvegarde
        <input type="file" accept=".json,application/json" class="sr" id="restaurer-debut"></label>
    </main>`;
  const form = $('#debut');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const devise = d.get('devise');
    const solde = d.get('solde').trim() ? versUnites(d.get('solde'), devise) : 0;
    if (solde == null) { $('.erreur', form).textContent = 'Le solde doit être un nombre, par exemple 120,5.'; return; }
    await initialiser({ deviseP: devise, compteNom: d.get('nom').trim() || 'Espèces', compteDevise: devise, soldeInitial: solde });
    location.hash = '#/accueil';
    majTaux();
  };
  $('#restaurer-debut').onchange = async (e) => {
    try {
      const donnees = JSON.parse(await e.target.files[0].text());
      if (donnees.app !== 'MyStudentWallet') throw new Error();
      await restaurer(donnees);
      toast('Sauvegarde restaurée');
    } catch {
      toast("Ce fichier n'est pas une sauvegarde MyStudentWallet.");
    }
  };
}

// ---- Interactions communes à tous les écrans -------------------------------------

app.addEventListener('click', (e) => {
  const ligne = e.target.closest('[data-op]');
  if (ligne) {
    const op = etat.operations.find((o) => o.id === ligne.dataset.op);
    if (op) ouvrirSaisie(op);
    return;
  }
  if (e.target.closest('[data-ajouter]')) { ouvrirSaisie(); return; }
  const aller = e.target.closest('[data-aller]');
  if (aller) location.hash = aller.dataset.aller;
});

// Raccourci clavier sur ordinateur : « n » pour une nouvelle opération.
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' && !e.target.closest('input, textarea, select') && !document.querySelector('.voile') && etat.reglages?.initialise) {
    e.preventDefault();
    ouvrirSaisie();
  }
});

// ---- Démarrage ----------------------------------------------------------------------

async function lancer() {
  try {
    await demarrer();
  } catch (err) {
    app.innerHTML = `<main class="bienvenue"><p class="erreur">Impossible d'ouvrir le stockage du téléphone (${esc(err?.message || err)}).
      En navigation privée, certains navigateurs le bloquent : ouvrez l'app dans un onglet normal.</p></main>`;
    return;
  }
  surChangement(dessiner);
  window.addEventListener('hashchange', dessiner);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appliquerTheme);
  dessiner();
  if (etat.reglages.initialise) majTaux();
  window.addEventListener('online', () => majTaux());

  // Raccourci de l'icône (appui long sur Android) : #/accueil?ajouter=1
  if (new URLSearchParams(location.hash.split('?')[1]).has('ajouter') && etat.reglages.initialise) {
    history.replaceState(null, '', '#/accueil');
    dessiner();
    ouvrirSaisie();
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

lancer();
