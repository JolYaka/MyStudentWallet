# MyStudentWallet

Application de suivi de dépenses pour étudiants, installable sur téléphone et utilisable sans connexion.

**Ouvrir l'app : https://jolyaka.github.io/MyStudentWallet/**

Elle répond à une question simple : *combien puis-je encore dépenser par jour jusqu'à ma prochaine rentrée d'argent ?*

## Installer sur son téléphone

- **Android (Chrome)** : ouvrir le lien, menu ⋮, puis *Installer l'application*.
- **iPhone (Safari)** : ouvrir le lien, bouton *Partager*, puis *Sur l'écran d'accueil*.

L'app s'ouvre ensuite comme une application normale, en plein écran, même en mode avion.

## Fonctionnalités

**Saisie**
- Ajout d'une dépense en trois gestes : montant, catégorie, valider.
- Revenus, dépenses et virements entre comptes.
- Date modifiable (aujourd'hui, hier, autre), note facultative.
- Modification et suppression, avec un bouton « Annuler » après chaque suppression.

**Suivi**
- **Reste à dépenser par jour** jusqu'à la prochaine rentrée d'argent (bourse, virement de la famille), une fois réservées les dépenses déjà prévues (loyer, forfait).
- Solde total et solde de chaque compte.
- Budgets mensuels par catégorie, avec jauge et alerte de dépassement.
- Opérations récurrentes (chaque semaine, chaque mois, chaque année), créées automatiquement à leur date.
- Analyse du mois : où part l'argent, montant mis de côté, évolution sur six mois.
- Historique complet groupé par jour, recherche sur tout l'historique, filtres par type et par compte.

**Multi-devises**
- Chaque compte a sa propre devise (DT, FCFA, euro, dollar...).
- Tous les totaux sont convertis dans une devise principale, modifiable à tout moment.
- Taux de change mis à jour automatiquement quand il y a du réseau, conservés hors ligne.
- Possibilité de saisir son propre taux (celui du bureau de change).
- Virement entre deux comptes de devises différentes, avec le montant reçu calculé puis modifiable.

**Données**
- Tout reste sur le téléphone : pas de compte, pas de serveur.
- Verrouillage par code à 4 chiffres et par empreinte digitale ; l'app se reverrouille après 30 secondes en arrière-plan. Ce verrou empêche quelqu'un d'ouvrir l'app sur votre téléphone, mais les données elles-mêmes ne sont pas chiffrées.
- Sauvegarde et restauration dans un fichier `.json`.
- Export CSV lisible directement par Excel ou Google Sheets.
- Mode clair, mode sombre ou automatique.

## Cahier des charges

La première version (JavaFX, été 2025, conservée sous l'étiquette git `v0-javafx`) avait été écrite sans cahier des charges. Ses limites ont servi de point de départ :

| Problème de la v0 | Réponse de la v2 |
|---|---|
| JavaFX est une technologie de bureau : l'app ne pouvait pas tourner sur téléphone | Application web installable (PWA), qui fonctionne hors ligne |
| Base SQLite cherchée dans `src/main/resources`, introuvable une fois l'app empaquetée | Stockage IndexedDB, intégré au navigateur |
| « Revenu » était une catégorie parmi d'autres | Revenus et dépenses séparés, chacun avec ses catégories |
| Date toujours égale au jour de saisie | Date libre |
| Ni modification ni suppression | Les deux, avec annulation |
| « Dépenses de ce mois » additionnait tout l'historique | Calculs réellement mensuels |
| Montants en nombres à virgule, donc erreurs d'arrondi | Montants en entiers (millimes, centimes, francs) |
| Une seule devise, codée en dur | Une devise par compte et une conversion automatique |
| Écrans Graphiques et Profil vides | Écran Analyse complet ; le profil est supprimé, il ne servait à rien |

**Choix écartés exprès** : la synchronisation en ligne et les comptes utilisateurs. Ils feraient sortir des données financières du téléphone et demanderaient un serveur à maintenir. La sauvegarde en fichier couvre le besoin de changer de téléphone.

## Comment c'est construit

Du HTML, du CSS et du JavaScript, sans framework et sans étape de compilation : chaque fichier se lit tel qu'il est exécuté.

```
index.html             La page unique de l'app
manifest.webmanifest   Nom, icônes, couleurs : ce qui rend l'app installable
sw.js                  Service worker : garde une copie de l'app pour le hors ligne
css/app.css            Tout le style ; les couleurs sont des variables (mode sombre)
js/
  app.js               Point d'entrée : choisit l'écran selon l'adresse (#/accueil...)
  store.js             La logique : soldes, budgets, récurrences, reste par jour
  db.js                Lecture et écriture dans IndexedDB
  money.js             Montants en entiers, formatage, conversion de devises
  rates.js             Mise à jour des taux de change
  saisie.js            La feuille d'ajout et de modification d'une opération
  ui.js                Outils d'interface : feuilles, messages, dates
  installation.js      Bouton et consignes d'installation selon le navigateur
  verrou.js            Code, empreinte digitale (WebAuthn) et écran de verrouillage
  icons.js             Icônes Lucide intégrées (licence ISC)
  ecrans/              Un fichier par écran : accueil, operations, analyse, reglages
assets/                Police Manrope et icônes de l'app
```

Trois principes à garder en tête si vous modifiez le code :

1. **Les montants sont des entiers.** `12,5 DT` est stocké `12500` (millimes). Toujours passer par `versUnites()` et `formater()` de `money.js`.
2. **Les calculs vivent dans `store.js`.** Les écrans affichent, ils ne calculent pas.
3. **Après chaque modification publiée, changer `VERSION` dans `sw.js`.** Sinon les téléphones gardent l'ancienne copie de l'app.

## Lancer en local

```bash
python -m http.server 8000
```

puis ouvrir http://localhost:8000. Le service worker fonctionne sur `localhost` : en cas de modification qui ne s'affiche pas, faire un rechargement forcé (Ctrl+Maj+R).

Les taux de change viennent de [open.er-api.com](https://www.exchangerate-api.com) (gratuit, sans clé).
