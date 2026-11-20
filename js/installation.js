// Installation de l'app sur l'écran d'accueil.
//
// Chrome envoie l'événement « beforeinstallprompt » une seule fois, souvent
// avant que nos modules soient chargés : il est donc capté par un petit script
// placé dans le <head> de index.html, qui le range dans window.__invite.

export const estInstallee = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const peutInstaller = () => !!window.__invite;

export async function installer() {
  const invite = window.__invite;
  if (!invite) return false;
  invite.prompt();
  const { outcome } = await invite.userChoice;
  window.__invite = null;
  return outcome === 'accepted';
}

// Marche à suivre quand le navigateur ne propose pas d'installation directe.
export function consigneInstallation() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua);
  if (ios && /CriOS|FxiOS|EdgiOS/.test(ua)) {
    return ["Sur iPhone, seul Safari sait installer une app web : ouvrez cette page dans <strong>Safari</strong>.",
      'Touchez le bouton <strong>Partager</strong>, puis <strong>Sur l\'écran d\'accueil</strong>.'];
  }
  if (ios) {
    return ['Touchez le bouton <strong>Partager</strong> en bas de Safari (le carré avec une flèche).',
      "Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong>.",
      'Touchez <strong>Ajouter</strong>.'];
  }
  if (/SamsungBrowser/.test(ua)) {
    return ['Touchez le menu <strong>≡</strong> en bas à droite.',
      "Choisissez <strong>Ajouter la page à</strong>, puis <strong>Écran d'accueil</strong>."];
  }
  if (/Firefox/.test(ua) && /Android/.test(ua)) {
    return ['Touchez le menu <strong>⋮</strong>.', 'Choisissez <strong>Installer</strong> ou <strong>Ajouter à l\'écran d\'accueil</strong>.'];
  }
  if (/Android/.test(ua)) {
    return ['Touchez le menu <strong>⋮</strong> en haut à droite de Chrome.',
      "Choisissez <strong>Installer l'application</strong> (ou <strong>Ajouter à l'écran d'accueil</strong>).",
      'Confirmez avec <strong>Installer</strong>.'];
  }
  return ["Dans Chrome ou Edge, cliquez sur l'icône d'installation à droite de la barre d'adresse.",
    'Sur téléphone, ouvrez cette page dans Chrome (Android) ou Safari (iPhone).'];
}
