// Verrouillage de l'app par code à 4 chiffres, et par empreinte digitale si
// le téléphone le permet.
//
// Ce que ça protège : quelqu'un qui prend votre téléphone déverrouillé et
// ouvre l'app ne voit rien sans le code ou votre doigt.
// Ce que ça ne protège pas : les données elles-mêmes ne sont pas chiffrées.
// Une personne qui a le téléphone et des outils de développeur peut les lire.
//
// Le code n'est jamais stocké en clair : on garde seulement son empreinte
// cryptographique (PBKDF2), impossible à « inverser » pour retrouver le code.
//
// L'empreinte digitale passe par WebAuthn, le standard des clés d'accès
// (passkeys). Le doigt ne quitte jamais le téléphone : Android vérifie
// lui-même l'empreinte et répond simplement « c'est bien le propriétaire ».

import { etat, majReglages, restaurer } from './store.js';
import { icon } from './icons.js';
import { confirmer, fermerFeuille, $, $$ } from './ui.js';

const ITERATIONS = 150000;
const DELAI_VERROUILLAGE = 30 * 1000; // 30 s en arrière-plan, puis on verrouille
const ESSAIS_AVANT_PAUSE = 5;

// ---- Petits outils ---------------------------------------------------------------

const enB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const aleatoire = (n) => crypto.getRandomValues(new Uint8Array(n));

async function hacher(code, sel) {
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: ITERATIONS }, cle, 256);
  return enB64(bits);
}

export const verrouActif = () => !!etat.reglages?.verrou?.hash;
export const empreinteActive = () => !!etat.reglages?.verrou?.credId;

export async function empreintePossible() {
  try {
    return !!window.PublicKeyCredential
      && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ---- Réglage du code et de l'empreinte -------------------------------------------------

export async function definirCode(code) {
  const sel = aleatoire(16);
  const hash = await hacher(code, sel);
  await majReglages({ verrou: { ...(etat.reglages.verrou || {}), sel: enB64(sel), hash } });
}

export async function verifierCode(code) {
  const v = etat.reglages.verrou;
  if (!v?.hash) return true;
  return (await hacher(code, deB64(v.sel))) === v.hash;
}

export async function desactiverVerrou() {
  await majReglages({ verrou: null });
}

// Enregistre l'empreinte : Android demande de poser le doigt une fois.
export async function activerEmpreinte() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: aleatoire(32),
      rp: { name: 'MyStudentWallet', id: location.hostname },
      user: { id: aleatoire(16), name: 'MyStudentWallet', displayName: 'MyStudentWallet' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  await majReglages({ verrou: { ...etat.reglages.verrou, credId: enB64(cred.rawId) } });
}

export async function desactiverEmpreinte() {
  const { credId, ...reste } = etat.reglages.verrou;
  await majReglages({ verrou: reste });
}

async function verifierEmpreinte() {
  const rep = await navigator.credentials.get({
    publicKey: {
      challenge: aleatoire(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: deB64(etat.reglages.verrou.credId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  // Octet 32 des données de l'authentificateur, bit 2 : « utilisateur vérifié »
  // (empreinte ou code du téléphone réellement contrôlé).
  const flags = new Uint8Array(rep.response.authenticatorData)[32];
  return (flags & 0x04) !== 0;
}

// ---- Clavier à 4 chiffres (réutilisé pour créer et pour vérifier un code) --------------

export function clavierCode(racine, { titre, sousTitre = '', onCode, actionsBas = '' }) {
  let saisi = '';
  racine.innerHTML = `
    <div class="code">
      <p class="code-titre">${titre}</p>
      <p class="code-sous texte-doux" aria-live="polite">${sousTitre}</p>
      <div class="code-points" aria-hidden="true">${'<i></i>'.repeat(4)}</div>
      <div class="pave">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-chiffre="${n}">${n}</button>`).join('')}
        <span class="pave-gauche">${actionsBas}</span>
        <button data-chiffre="0">0</button>
        <button data-effacer aria-label="Effacer">${icon('delete', 24)}</button>
      </div>
    </div>`;
  const points = $$('.code-points i', racine);
  const maj = () => points.forEach((p, i) => p.classList.toggle('plein', i < saisi.length));
  const api = {
    message(t, erreur = false) {
      const s = $('.code-sous', racine);
      s.textContent = t;
      s.classList.toggle('erreur', erreur);
    },
    secouer() {
      const c = $('.code-points', racine);
      c.classList.remove('secoue');
      void c.offsetWidth;
      c.classList.add('secoue');
      saisi = '';
      maj();
    },
    vider() { saisi = ''; maj(); },
    bloquer(oui) { $$('.pave button', racine).forEach((b) => { b.disabled = oui; }); },
  };
  const taper = (ch) => {
    if (saisi.length >= 4) return;
    saisi += ch;
    maj();
    if (saisi.length === 4) {
      const code = saisi;
      setTimeout(() => onCode(code, api), 120);
    }
  };
  $$('[data-chiffre]', racine).forEach((b) => b.onclick = () => taper(b.dataset.chiffre));
  $('[data-effacer]', racine).onclick = () => { saisi = saisi.slice(0, -1); maj(); };
  // Clavier physique (ordinateur).
  racine.addEventListener('keydown', (e) => {
    if (/^\d$/.test(e.key)) taper(e.key);
    if (e.key === 'Backspace') { saisi = saisi.slice(0, -1); maj(); }
  });
  return api;
}

// ---- Écran de verrouillage -----------------------------------------------------------------

let ecran = null;

export function verrouiller() {
  if (!verrouActif() || ecran) return Promise.resolve();
  // Une feuille ouverte (saisie en cours...) montrerait des données : on la ferme.
  fermerFeuille(true);
  return new Promise((resolve) => {
    ecran = document.createElement('div');
    ecran.className = 'verrou';
    ecran.tabIndex = -1;
    ecran.setAttribute('role', 'dialog');
    ecran.setAttribute('aria-modal', 'true');
    ecran.setAttribute('aria-label', 'Application verrouillée');
    document.body.appendChild(ecran);
    document.getElementById('app').inert = true;
    document.body.classList.add('fige');

    let erreurs = 0;
    const ouvrir = () => {
      ecran.remove();
      ecran = null;
      document.getElementById('app').inert = false;
      if (!document.querySelector('.voile')) document.body.classList.remove('fige');
      resolve();
    };
    const avecEmpreinte = empreinteActive();
    const clavier = clavierCode(ecran, {
      titre: `${icon('lock', 22)} MyStudentWallet`,
      sousTitre: 'Saisissez votre code',
      actionsBas: avecEmpreinte ? `<button data-empreinte aria-label="Utiliser l'empreinte">${icon('fingerprint', 26)}</button>` : '',
      onCode: async (code, api) => {
        if (await verifierCode(code)) { ouvrir(); return; }
        erreurs++;
        api.secouer();
        if (erreurs % ESSAIS_AVANT_PAUSE === 0) {
          api.bloquer(true);
          let reste = 30;
          const tic = setInterval(() => {
            api.message(`Trop d'essais. Réessayez dans ${reste--} s.`, true);
            if (reste < 0) { clearInterval(tic); api.bloquer(false); api.message('Saisissez votre code'); }
          }, 1000);
        } else {
          api.message('Code incorrect', true);
        }
      },
    });
    const bas = document.createElement('button');
    bas.className = 'btn-lien code-oublie';
    bas.textContent = 'Code oublié ?';
    bas.onclick = codeOublie;
    ecran.querySelector('.code').appendChild(bas);
    ecran.focus();

    const essayerEmpreinte = async () => {
      try {
        if (await verifierEmpreinte()) ouvrir();
      } catch {
        clavier.message('Empreinte non reconnue : saisissez votre code');
      }
    };
    ecran.querySelector('[data-empreinte]')?.addEventListener('click', essayerEmpreinte);
    // Propose l'empreinte tout de suite à l'ouverture.
    if (avecEmpreinte) setTimeout(essayerEmpreinte, 300);
  });
}

async function codeOublie() {
  const ok = await confirmer({
    titre: 'Code oublié',
    texte: "Le code ne peut pas être récupéré. La seule solution est d'effacer toutes les données de l'app, puis de restaurer votre dernière sauvegarde si vous en avez une.",
    action: 'Tout effacer',
  });
  if (!ok) return;
  await restaurer({});
  ecran?.remove();
  ecran = null;
  document.getElementById('app').inert = false;
  document.body.classList.remove('fige');
  location.hash = '#/accueil';
}

// Verrouille quand l'app est restée plus de 30 secondes en arrière-plan.
export function surveillerArrierePlan() {
  let cacheeDepuis = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cacheeDepuis = Date.now();
    } else if (cacheeDepuis && Date.now() - cacheeDepuis > DELAI_VERROUILLAGE) {
      cacheeDepuis = null;
      verrouiller();
    }
  });
}
