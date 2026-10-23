# MK Formation — Matt Konnect
> Solution de gestion administrative, financière et pédagogique pour organisme de formation certifié **Qualiopi**.

Application web moderne développée avec **React 19**, **TypeScript**, **Tailwind CSS** et **Vite**, intégrant un contrôle d'accès strict par rôles (RBAC), le versionnage de catalogue, la signature d'émargements numériques, la facturation OPCO / Entreprise, la traçabilité des preuves d'audit et la file d'automatisation des communications.

---

## Sommaire

1. [Fonctionnalités principales](#1-fonctionnalités-principales)
2. [Profils & Rôles pré-configurés](#2-profils--rôles-pré-configurés)
3. [Installation en local (Environnement de développement)](#3-installation-en-local-environnement-de-développement)
   - [Prérequis](#prérequis)
   - [Installation des dépendances](#installation-des-dépendances)
   - [Variables d'environnement (.env)](#variables-denvironnement-env)
   - [Lancement du serveur de développement](#lancement-du-serveur-de-développement)
   - [Tests unitaires et d'intégration](#tests-unitaires-et-dintégration)
   - [Vérification du code (Lint & Typage)](#vérification-du-code-lint--typage)
4. [Déploiement sur hébergement mutualisé O2switch](#4-déploiement-sur-hébergement-mutualisé-o2switch)
   - [Pourquoi O2switch ?](#pourquoi-o2switch-)
   - [Méthode 1 : Déploiement Statique SPA (Recommandée)](#méthode-1--déploiement-statique-spa-recommandée)
   - [Méthode 2 : Déploiement avec Node.js (cPanel Setup Node.js App)](#méthode-2--déploiement-avec-nodejs-cpanel-setup-nodejs-app)
   - [Configuration du fichier .htaccess Apache](#configuration-du-fichier-htaccess-apache)
   - [Activation du Certificat SSL Let's Encrypt](#activation-du-certificat-ssl-lets-encrypt)
   - [Configuration de la messagerie O2switch (SMTP & IMAP)](#configuration-de-la-messagerie-o2switch-smtp--imap)
   - [Délivrabilité des emails : SPF, DKIM et DMARC](#délivrabilité-des-emails--spf-dkim-et-dmarc)
   - [Tâches planifiées (Cron Jobs O2switch)](#tâches-planifiées-cron-jobs-o2switch)
   - [Sauvegardes automatiques (JetBackup O2switch)](#sauvegardes-automatiques-jetbackup-o2switch)
5. [Structure du projet](#5-structure-du-projet)
6. [Dépannage & FAQ O2switch](#6-dépannage--faq-o2switch)

---

## 1. Fonctionnalités principales

- **Catalogue de formation modulaire** :
  - Création, modification, archivage et suppression de programmes.
  - Découpage pédagogique complet par modules (objectifs, durées, prérequis, modalités d'évaluation).
  - Versionnage strict des fiches programmes (ex: v1, v2) sans altération de l'historique légal.
- **Gestion des entreprises & stagiaires** :
  - Fiches entreprises avec SIREN validé (Algorithme de Luhn), contacts RH et OPCO de rattachement (ex: ATLAS, AKTO, OPCO EP, AFDAS, Constructys...).
  - Rattachement direct des stagiaires à leur entreprise.
- **Sessions & Émargements numériques** :
  - Planification des sessions (dates, formateur attitré, salle / distanciel).
  - Feuilles d'émargement demi-journée par demi-journée avec signatures numériques sécurisées (horodatage ISO et empreinte SHA-256).
- **Facturation & Conformité financière** :
  - Calculs au centime d'euro sans dérive à virgule flottante.
  - Gestion des règlements partiels, soldes dus, facturation subrogée OPCO et factures d'acompte.
- **Documents officiels conformes DGEFP & Qualiopi** :
  - Convocations individuelles avec programme annexé.
  - Conventions de formation professionnelle (L. 6353-1 du Code du travail).
  - Certificats de réalisation conformes à l'arrêté ministériel.
  - Attestations de fin de formation et synthèses d'évaluation des compétences.
  - Empreintes cryptographiques SHA-256 pour chaque document généré.
- **Contrôle d'accès étanche (RBAC)** :
  - Les contacts clients RH ne peuvent consulter que les données, stagiaires et factures de leur propre entreprise.
  - Les stagiaires n'ont accès qu'à leur propre espace (émargements, convocations, certificats).
  - Les formateurs accèdent à leurs sessions et feuilles d'émargement sans accès aux facturations.
  - Les administrateurs pilotent l'ensemble du système, les audits et la gestion des comptes.
- **Portail d'authentification complet** :
  - Page de connexion avec hachage de mot de passe sécurisé (PBKDF2 avec sel unique par utilisateur).
  - Inscription autonome pour les entreprises clientes (création de l'entreprise + compte RH).
  - Inscription autonome pour les stagiaires (rattachement à l'entreprise cliente).
  - Procédure de réinitialisation de mot de passe oublié.
  - Console d'administration des comptes (création, changement de rôle, suspension, réinitialisation de mot de passe).
- **File d'automatisation des notifications** :
  - Envois programmés (convocation à J-14, rappel émargement à J-1, enquête de satisfaction à J+1).
  - Gestion de l'idempotence (aucun doublon d'envoi pour un même événement).

---

## 2. Profils & Rôles pré-configurés

Pour faciliter les tests et démonstrations, l'application intègre 4 comptes immédiatement opérationnels (accessibles via la page de connexion ou le sélecteur de profil en haut à droite) :

| Utilisateur | Rôle | Email | Mot de passe par défaut | Droits d'accès |
| :--- | :--- | :--- | :--- | :--- |
| **Marc Dupont** | `ADMIN` | `marc.dupont@mattkonnect.com` | `AdminPass2026!` | Accès total : Catalogue, Sessions, Entreprises, Facturation, Qualiopi, Audit, Gestion des utilisateurs |
| **Sophie Bernard** | `TRAINER` | `sophie.bernard@mattkonnect.com` | `TrainerPass2026!` | Sessions assignées, émargements numériques, attestations stagiaires |
| **Claire Moreau** | `CLIENT_CONTACT` | `claire.moreau@acme.fr` | `ClientPass2026!` | Espace Entreprise RH Acme Industries : suivi des stagiaires inscrits, convocations et factures Acme |
| **Lucas Martin** | `BENEFICIARY` | `lucas.martin@acme.fr` | `LearnerPass2026!` | Espace Apprenant : émargement de ses sessions, téléchargement de son certificat de réalisation |

---

## 3. Installation en local (Environnement de développement)

### Prérequis

Assurez-vous que les outils suivants sont installés sur votre machine :
- **Node.js** : version 20.x LTS ou supérieure ([télécharger Node.js](https://nodejs.org/))
- **npm** (inclus avec Node.js) ou **bun** / **yarn** / **pnpm**
- **Git**

Vérifiez les versions installées :
```bash
node -v   # Doit afficher v20.x ou supérieur
npm -v    # Doit afficher v10.x ou supérieur
```

### Installation des dépendances

1. Clonez le dépôt ou décompressez l'archive du projet dans votre répertoire de travail :
```bash
git clone <URL_DU_DEPOT> mk-formation
cd mk-formation
```

2. Installez l'ensemble des dépendances Node.js :
```bash
npm install
```

### Variables d'environnement (.env)

Créez votre fichier `.env` local en copiant le modèle `.env.example` :
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos configurations :
```env
# Clé Gemini AI (optionnelle, pour l'assistance pédagogique)
GEMINI_API_KEY="votre_cle_si_necessaire"

# URL publique de l'application en local
APP_URL="http://localhost:3000"

# Configuration SMTP (Envoi des emails : convocations, conventions, attestations)
SMTP_HOST="smtp.votredomaine.fr"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="notifications@votredomaine.fr"
SMTP_PASS="votre_mot_de_passe_smtp"
SMTP_FROM="MK Formation <contact@votredomaine.fr>"

# Configuration IMAP (Relève des pièces jointes et justificatifs d'émargement)
IMAP_HOST="imap.votredomaine.fr"
IMAP_PORT="993"
IMAP_TLS="true"
IMAP_USER="emargement@votredomaine.fr"
IMAP_PASS="votre_mot_de_passe_imap"
```

### Lancement du serveur de développement

Démarrez le serveur Vite en local :
```bash
npm run dev
```

L'application est immédiatement accessible dans votre navigateur à l'adresse :
👉 **`http://localhost:3000`**

### Tests unitaires et d'intégration

Le projet dispose d'une suite de **38 tests automatisés** validant l'intégrité financière, le respect des règles Qualiopi, l'étanchéité RBAC, le chiffrement des mots de passe, et le cycle de vie des sessions :

```bash
npm test
```

Tous les tests doivent afficher l'état `ok`.

### Vérification du code (Lint & Typage)

Pour vérifier qu'aucune erreur TypeScript n'est présente :
```bash
npm run lint
```

---

## 4. Déploiement sur hébergement mutualisé O2switch

### Pourquoi O2switch ?

**O2switch** est un hébergeur web 100% français basé à Clermont-Ferrand, propriétaire de ses datacenters et serveurs. Son offre unique mutualisée propose :
- Stockage NVMe illimité
- Certificats SSL Let's Encrypt gratuits et automatisés
- Serveurs web **LiteSpeed Web Server** avec support complet des règles Apache `.htaccess`
- Gestionnaire d'applications **Node.js** intégré dans cPanel
- Comptes de messagerie illimités avec SPF/DKIM/DMARC natifs
- Sauvegardes quotidiennes indépendantes via **JetBackup 5**

---

### Méthode 1 : Déploiement Statique SPA (Recommandée)

Cette méthode est la plus simple, la plus rapide et la plus robuste pour un hébergement mutualisé. Vite compile l'intégralité de l'application en fichiers HTML, CSS, JavaScript et assets statiques optimisés avec le fichier `.htaccess` gérant le routage.

#### Étape 1 : Compiler l'application en production
Sur votre machine locale :
```bash
npm run build
```
Cette commande crée un dossier **`dist/`** contenant :
- `index.html` (minifié)
- `assets/` (fichiers JS et CSS avec empreinte de hachage unique pour le cache)
- `.htaccess` (copié automatiquement depuis `public/.htaccess`)

#### Étape 2 : Préparer le domaine ou sous-domaine sur cPanel O2switch
1. Connectez-vous à votre interface **cPanel O2switch** (généralement `https://votre-serveur.o2switch.net:2083` ou `https://votredomaine.fr:2083`).
2. Si vous souhaitez déployer sur un sous-domaine (ex: `formation.mattkonnect.com`) :
   - Allez dans la section **Domaines** > **Domaines**.
   - Cliquez sur **Créer un nouveau domaine**.
   - Saisissez `formation.mattkonnect.com`.
   - Cochez ou spécifiez la racine du document : `/home/votre_identifiant/formation.mattkonnect.com` (ou `/public_html/formation`).
   - Cliquez sur **Envoyer**.
3. Si vous déployez sur le domaine principal : le répertoire cible est simplement **`/home/votre_identifiant/public_html`**.

#### Étape 3 : Téléverser les fichiers vers O2switch

Vous avez deux méthodes au choix :

##### Option A — Par le Gestionnaire de fichiers cPanel (Le plus rapide)
1. Dans votre dossier local, compressez le **contenu** du dossier `dist/` en un fichier `dist.zip`. *(Attention à bien compresser les fichiers à l'intérieur de `dist/`, et non le dossier `dist` lui-même).*
2. Dans cPanel, ouvrez **Fichiers** > **Gestionnaire de fichiers**.
3. Naviguez vers le dossier cible (`public_html` ou le dossier de votre sous-domaine).
4. Cliquez sur **Charger** en haut, et sélectionnez votre fichier `dist.zip`.
5. Une fois le téléversement terminé (100%), retournez dans le gestionnaire, faites un clic droit sur `dist.zip` et sélectionnez **Extraire**.
6. Supprimez l'archive `dist.zip`.
7. **Important** : Cliquez sur **Paramètres** en haut à droite du Gestionnaire de fichiers et assurez-vous que la case **Afficher les fichiers masqués (dotfiles)** est bien cochée pour vérifier la présence du fichier `.htaccess`.

##### Option B — Par FTP avec FileZilla
1. Ouvrez **FileZilla**.
2. Renseignez vos identifiants fournis par O2switch :
   - **Hôte** : `ftp.votredomaine.fr` (ou l'adresse IP du serveur O2switch)
   - **Identifiant** : votre nom d'utilisateur cPanel
   - **Mot de passe** : votre mot de passe cPanel
   - **Port** : `21` (Chiffrement : *Connexion FTP explicite sur TLS*)
3. Dans la fenêtre de droite (serveur distant), accédez à votre dossier web cible (`public_html` ou sous-domaine).
4. Dans la fenêtre de gauche (machine locale), ouvrez le dossier `dist/`.
5. Sélectionnez tous les fichiers et sous-dossiers (`index.html`, dossier `assets/`, `.htaccess`) et glissez-les vers la fenêtre de droite.

---

### Méthode 2 : Déploiement avec Node.js (cPanel Setup Node.js App)

Si vous souhaitez exécuter le serveur d'automatisation ou un backend Express directement sur le mutualisé O2switch :

1. Dans cPanel O2switch, cherchez la rubrique **Logiciels** > **Setup Node.js App**.
2. Cliquez sur **Create Application**.
3. Remplissez les champs suivants :
   - **Node.js version** : Choisissez la version **20.x** ou **22.x**.
   - **Application mode** : `Production`.
   - **Application root** : Le dossier où vous déposez le code source (ex: `apps/mk-formation`).
   - **Application URL** : L'URL publique de votre application.
   - **Application startup file** : `server.js` (ou votre point d'entrée compilé).
4. Cliquez sur **Create**.
5. Téléversez votre code source (excluez le dossier `node_modules`).
6. Dans l'interface cPanel Node.js, cliquez sur le bouton **Run NPM Install** pour installer les dépendances directement sur le serveur O2switch.
7. Dans la section **Environment variables**, ajoutez vos clés issues de `.env` (`SMTP_HOST`, `SMTP_USER`, etc.).
8. Cliquez sur **Restart** pour redémarrer l'application.

---

### Configuration du fichier .htaccess Apache

Le projet inclut déjà le fichier `.htaccess` dans `/public/.htaccess`. Lors du build (`npm run build`), il est automatiquement placé à la racine du dossier `dist/`.

Son rôle est capital pour un fonctionnement parfait sur O2switch :
```apache
# 1. Moteur de réécriture et forçage HTTPS
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Rediriger tout le trafic HTTP vers HTTPS
  RewriteCond %{HTTPS} !=on
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Routage SPA (évite l'erreur 404 lors du rafraîchissement d'une page interne)
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>

# 2. En-têtes de sécurité HTTP (Conformité Qualiopi & RGPD)
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# 3. Cache optimisé Vite
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 month"

  # Aucun cache pour index.html pour charger instantanément les mises à jour
  <FilesMatch "^index\.html$">
    ExpiresActive Off
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>

  # Cache longue durée (1 an) pour les assets minifiés avec hash
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

# 4. Compression Gzip / Deflate
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json image/svg+xml
</IfModule>

# 5. Protection des fichiers sensibles
<FilesMatch "^\.">
  Order allow,deny
  Deny from all
</FilesMatch>
```

---

### Activation du Certificat SSL Let's Encrypt

O2switch fournit des certificats SSL gratuits et renouvelés automatiquement :
1. Dans cPanel, section **Sécurité**, cliquez sur **Let's Encrypt™ SSL**.
2. Sous la liste de vos domaines, repérez votre domaine ou sous-domaine.
3. Cliquez sur le lien **Générer** (ou **Issue**).
4. Laissez les options par défaut (`http-01`) cochées et cliquez sur **Générer**.
5. Votre certificat SSL est actif sous 2 minutes : le cadenas sécurisé `https://` s'affiche sur votre site.

---

### Configuration de la messagerie O2switch (SMTP & IMAP)

Pour que l'envoi de convocations, conventions et attestations fonctionne avec une délivrabilité optimale :

#### 1. Créer une boîte email dédiée sur cPanel
1. Rendez-vous dans **E-mail** > **Comptes de messagerie**.
2. Cliquez sur **Créer**.
3. Saisissez le nom d'utilisateur (ex: `notifications` ou `contact`).
4. Définissez un mot de passe robuste (notez-le précieusement).
5. Définissez le quota (par exemple illimité ou 5000 Mo).
6. Cliquez sur **Créer**.

#### 2. Paramètres de connexion SMTP & IMAP O2switch

| Service | Paramètre | Valeur recommandée |
| :--- | :--- | :--- |
| **SMTP** | Serveur sortant | `mail.votredomaine.fr` *(ou le nom de votre serveur o2switch, ex: `cl-srv01.o2switch.net`)* |
| | Port SMTP | **`465`** (avec SSL/TLS) ou **`587`** (avec STARTTLS) |
| | Authentification | **Requise** (Utiliser l'adresse email complète + mot de passe) |
| **IMAP** | Serveur entrant | `mail.votredomaine.fr` |
| | Port IMAP | **`993`** (avec SSL/TLS) |
| | Authentification | **Requise** |

---

### Délivrabilité des emails : SPF, DKIM et DMARC

Les organismes de formation et financeurs (OPCO) filtrent sévèrement les emails. Sur O2switch, la configuration s'effectue en quelques clics :

1. Dans cPanel, allez dans **E-mail** > **Email Deliverability** (Délivrabilité des e-mails).
2. Repérez votre nom de domaine.
3. Vérifiez que le statut indique **Valide** pour **DKIM** et **SPF**.
4. Si le statut indique "Problème détecté", cliquez sur **Gérer** puis sur **Installer les enregistrements suggérés**. O2switch configurera automatiquement votre zone DNS avec :
   - **SPF** : `v=spf1 include:_spf.o2switch.net ~all`
   - **DKIM** : Clé publique RSA 2048 bits générée automatiquement.
   - **DMARC** : `v=DMARC1; p=none; sp=none; rua=mailto:dmarc@votredomaine.fr`

---

### Tâches planifiées (Cron Jobs O2switch)

Pour exécuter automatiquement la relève des signatures ou l'envoi des rappels de convocation :

1. Dans cPanel, allez dans **Avancé** > **Tâches cron**.
2. Dans le menu déroulant **Paramètres courants**, sélectionnez par exemple : *Une fois par heure* ou *Tous les jours à minuit*.
3. Dans le champ **Commande**, saisissez la commande selon votre configuration :
   - Pour un script Node.js :
     ```bash
     /home/votre_identifiant/nodevenv/apps/mk-formation/20/bin/node /home/votre_identifiant/apps/mk-formation/scripts/processAutomations.js >/dev/null 2>&1
     ```
   - Ou pour déclencher un webhook sécurisé :
     ```bash
     curl -s -X POST https://formation.votredomaine.fr/api/cron/process >/dev/null 2>&1
     ```
4. Cliquez sur **Ajouter une nouvelle tâche cron**.

---

### Sauvegardes automatiques (JetBackup O2switch)

O2switch intègre le système **JetBackup 5**, effectuant une sauvegarde quotidienne complète de vos fichiers, bases de données et comptes emails avec un historique sur plusieurs semaines :

1. Dans cPanel, section **Fichiers**, cliquez sur **JetBackup 5**.
2. Pour restaurer vos fichiers en cas d'erreur de manipulation :
   - Cliquez sur **File Backups**.
   - Choisissez la date de sauvegarde souhaitée.
   - Cliquez sur **File Manager**, cochez les répertoires à restaurer, puis cliquez sur **Restore**.

---

## 5. Structure du projet

```text
mk-formation/
├── .env.example              # Gabarit des variables d'environnement (SMTP, IMAP, etc.)
├── index.html                # Point d'entrée HTML principal (titre, meta OG, lang="fr")
├── metadata.json             # Métadonnées de l'application AI Studio
├── package.json              # Dépendances et scripts de build / test / lint
├── tsconfig.json             # Configuration TypeScript stricte
├── vite.config.ts            # Configuration Vite + Tailwind CSS v4 + alias @/
├── public/
│   └── .htaccess             # Configuration Apache LiteSpeed pour O2switch
├── src/
│   ├── main.tsx              # Montage React 19
│   ├── App.tsx               # Shell principal, middleware d'authentification et routage
│   ├── index.css             # Styles globaux Tailwind CSS
│   ├── components/           # Composants graphiques modulaires
│   │   ├── AuthPage.tsx             # Portail de connexion, inscription et mot de passe oublié
│   │   ├── Header.tsx               # Barre supérieure 3 zones, switch de profils, déconnexion
│   │   ├── UserManagementModal.tsx  # Console d'administration des comptes utilisateurs
│   │   ├── DashboardView.tsx        # Vue synthétique indicateurs clés Qualiopi
│   │   ├── CatalogView.tsx          # Gestion et découpage du catalogue de formation
│   │   ├── CompaniesView.tsx        # Fiches entreprises et stagiaires
│   │   ├── SessionsView.tsx         # Sessions, plannings et feuilles d'émargement
│   │   ├── FinanceView.tsx          # Facturation, subrogations OPCO, règlements
│   │   ├── DocumentsView.tsx        # Convocations, conventions, attestations officielles
│   │   ├── QualiopiView.tsx         # Suivi des 7 critères et 32 indicateurs du RNQ
│   │   ├── AutomationsView.tsx      # File d'attente d'envoi d'emails idempotente
│   │   ├── AuditView.tsx            # Journal immuable d'audit des actions et connexions
│   │   └── DocumentPreviewModal.tsx # Prévisualisation et impression des documents officiels
│   ├── server/               # Moteur métier et stockage
│   │   ├── database.ts       # Base de données, authentification, isolation RBAC et CRUD
│   │   ├── automations.ts    # Moteur de files d'automatisation des emails
│   │   ├── crypto.ts         # Hachage PBKDF2/SHA-256 et signatures numériques
│   │   ├── policy.ts         # Politiques de contrôle d'accès strictes
│   │   └── audit.ts          # Journalisation des événements
│   ├── services/
│   │   └── appState.ts       # Store réactif d'état applicatif avec persistance
│   └── types/
│       └── index.ts          # Définitions des types TypeScript
└── tests/                    # 38 tests automatisés de validation
    ├── automations.test.ts
    ├── catalog_crud.test.ts
    ├── certificates.test.ts
    ├── company_crud.test.ts
    ├── finance_integrity.test.ts
    ├── rbac_isolation.test.ts
    ├── security_auth.test.ts
    └── user_management_auth.test.ts
```

---

## 6. Dépannage & FAQ O2switch

### Q1 : Lors du rafraîchissement d'une page (ex: F5 sur un sous-menu), j'obtiens une erreur 404 Not Found.
- **Cause** : Le serveur Apache cherche un dossier physique correspondant au chemin de l'URL au lieu de laisser React gérer la route.
- **Solution** : Vérifiez que le fichier `.htaccess` est bien présent à la racine de votre dossier web sur O2switch (`public_html` ou sous-domaine). Si vous utilisez le Gestionnaire de fichiers cPanel, activez l'option **Afficher les fichiers masqués (dotfiles)** pour vous assurer qu'il a bien été téléversé.

### Q2 : Après avoir mis à jour les fichiers sur O2switch, je continue de voir l'ancienne version.
- **Cause** : Le système de cache d'O2switch (**XtremCache / Varnish / LiteSpeed**) a mis en mémoire tampon les anciennes pages.
- **Solution** :
  1. Dans votre cPanel, cherchez l'outil **XtremCache** ou **LiteSpeed Web ADC**.
  2. Cliquez sur **Vider le cache** (Flush / Purge All).
  3. Dans votre navigateur, faites un rechargement forcé avec `Ctrl + F5` (ou `Cmd + Shift + R` sur Mac).

### Q3 : Quels droits CHMOD appliquer sur les fichiers ?
- **Répertoires** : `755` (`rwxr-xr-x`)
- **Fichiers** : `644` (`rw-r--r--`)
- Les serveurs O2switch sous SuExec / CloudLinux bloquent l'exécution des fichiers avec des permissions `777` pour des raisons de sécurité.

### Q4 : Les emails envoyés arrivent dans les spams de mes clients.
- **Vérification** : Allez dans cPanel > **E-mail** > **Email Deliverability**.
- Vérifiez que **SPF** et **DKIM** sont marqués comme valides.
- Assurez-vous d'utiliser une adresse d'expéditeur appartenant au même domaine que votre site (évitez `gmail.com` ou `yahoo.fr` comme adresse `FROM`).

---

**MK Formation** — Développé pour Matt Konnect  
Support et maintenance conformes aux exigences du Référentiel National Qualité (RNQ Qualiopi).
