/**
 * MK Formation — Dedicated Authentication & Registration Page
 * Features:
 * - Tabbed Login & Self-Registration (Entreprise RH vs Stagiaire)
 * - 1-Click quick login demo personas (Marc Admin, Sophie Formateur, Claire Client RH, Lucas Stagiaire)
 * - Real PBKDF2 / SHA-256 verification via DatabaseStore
 * - SIREN verification & OPCO tracking for Enterprise self-registration
 * - Strict privilege escalation prevention (Admins & Trainers are managed via Admin console)
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import {
  Lock,
  Mail,
  User,
  Building2,
  ShieldCheck,
  Check,
  AlertCircle,
  KeyRound,
  GraduationCap,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess?: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  defaultTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [registerType, setRegisterType] = useState<'COMPANY_CLIENT' | 'BENEFICIARY'>(
    'COMPANY_CLIENT'
  );

  const allCompanies = appState.getCompanies();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regSiren, setRegSiren] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPostalCode, setRegPostalCode] = useState('');
  const [regOpco, setRegOpco] = useState('ATLAS');
  const [regCompanyId, setRegCompanyId] = useState(allCompanies[0]?.id || '');

  // UI status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Demo Accounts
  const demoAccounts = [
    {
      id: 'USR-ADMIN-01',
      name: 'Marc Dupont',
      email: 'marc.dupont@mattkonnect.com',
      pass: 'AdminPass2026!',
      role: 'Administrateur',
      desc: 'Pilotage Qualiopi, gestion catalogue, finances & comptes utilisateurs',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    {
      id: 'USR-TRAINER-01',
      name: 'Sophie Bernard',
      email: 'sophie.bernard@mattkonnect.com',
      pass: 'TrainerPass2026!',
      role: 'Formatrice',
      desc: 'Animation sessions, émargements numériques & suivi apprenants',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      id: 'USR-CLIENT-01',
      name: 'Claire Moreau',
      email: 'claire.moreau@acme.fr',
      pass: 'ClientPass2026!',
      role: 'Contact Client RH',
      desc: 'Acme Industries · Convocations, inscriptions directes & factures',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      id: 'USR-BENEF-01',
      name: 'Lucas Martin',
      email: 'lucas.martin@acme.fr',
      pass: 'LearnerPass2026!',
      role: 'Stagiaire',
      desc: 'Portail apprenant · Emargement en ligne, convocations & certificats',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  ];

  const handleQuickLogin = (email: string, pass: string) => {
    setErrorMessage(null);
    const success = appState.login(email, pass);
    if (success) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErrorMessage('Impossible de se connecter avec ce profil démo.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Veuillez saisir votre email et votre mot de passe.');
      return;
    }

    const success = appState.login(loginEmail.trim(), loginPassword);
    if (!success) {
      setErrorMessage(
        'Identifiants incorrects ou compte inactif. Vérifiez votre adresse email et votre mot de passe.'
      );
      return;
    }

    if (onLoginSuccess) onLoginSuccess();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regFirstName.trim() || !regLastName.trim()) {
      setErrorMessage('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Une adresse email valide est obligatoire.');
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    try {
      if (registerType === 'COMPANY_CLIENT') {
        if (!regCompanyName.trim()) {
          setErrorMessage("La raison sociale de l'entreprise est requise.");
          return;
        }
        const cleanedSiren = regSiren.replace(/\s+/g, '');
        if (cleanedSiren.length !== 9 || !/^\d+$/.test(cleanedSiren)) {
          setErrorMessage('Le numéro SIREN doit comporter exactement 9 chiffres.');
          return;
        }

        appState.selfRegister({
          accountType: 'COMPANY_CLIENT',
          firstName: regFirstName.trim(),
          lastName: regLastName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          phone: regPhone.trim() || undefined,
          companyName: regCompanyName.trim(),
          siren: cleanedSiren,
          city: regCity.trim() || undefined,
          postalCode: regPostalCode.trim() || undefined,
          opcoName: regOpco || undefined,
        });
      } else {
        if (!regCompanyId) {
          setErrorMessage('Veuillez sélectionner votre entreprise de rattachement.');
          return;
        }

        appState.selfRegister({
          accountType: 'BENEFICIARY',
          firstName: regFirstName.trim(),
          lastName: regLastName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          phone: regPhone.trim() || undefined,
          companyId: regCompanyId,
        });
      }

      setSuccessMessage('Compte créé avec succès ! Connexion automatique en cours...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création du compte';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      {/* Top Banner / Brand */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-blue-500/20">
            MK
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              MK Formation
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Qualiopi
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Système de gestion certifié · Matt Konnect SAS
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sécurité SHA-256 & Audit Qualiopi</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto my-auto py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left / Info Column */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium text-blue-400 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plateforme de Formation Continue</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Portail d'accès sécurisé
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connectez-vous à votre espace dédié ou créez votre compte entreprise/stagiaire pour suivre vos formations et émargements en temps réel.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Convocations & Conventions certifiées SHA-256</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Émargement numérique conforme DGEFP & OPCO</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Isolation stricte des données entreprises & stagiaires</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Personas Selection */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Profils de test (1 Clic)
                </span>
                <span className="text-[10px] text-slate-500">Sans mot de passe</span>
              </div>
              <div className="space-y-2">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleQuickLogin(demo.email, demo.pass)}
                    className="w-full text-left p-2.5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-lg transition-all group flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {demo.name}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${demo.badgeClass}`}
                        >
                          {demo.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {demo.desc}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right / Form Column */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Tab Selector */}
              <div className="flex items-center border-b border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    tab === 'login'
                      ? 'text-blue-400 border-blue-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    tab === 'register'
                      ? 'text-emerald-400 border-emerald-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  S'inscrire (Nouveau compte)
                </button>
              </div>

              {/* Status Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* TAB 1: LOGIN */}
              {tab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="nom@entreprise.fr"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        Mot de passe
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Chiffré PBKDF2/SHA-256
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Accéder à mon espace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-4 text-center">
                    <p className="text-xs text-slate-400">
                      Vous n'avez pas encore de compte ?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('register');
                          setErrorMessage(null);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
                      >
                        Créer un compte entreprise ou stagiaire
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2: REGISTER */}
              {tab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Account Type Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRegisterType('COMPANY_CLIENT')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-semibold transition-all ${
                        registerType === 'COMPANY_CLIENT'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Entreprise & RH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterType('BENEFICIARY')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-semibold transition-all ${
                        registerType === 'BENEFICIARY'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Salarié Stagiaire</span>
                    </button>
                  </div>

                  {/* Company specific fields */}
                  {registerType === 'COMPANY_CLIENT' ? (
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Informations de l'entreprise</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Raison Sociale *
                          </label>
                          <input
                            type="text"
                            value={regCompanyName}
                            onChange={(e) => setRegCompanyName(e.target.value)}
                            placeholder="ex. NovaTech SAS"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Numéro SIREN (9 chiffres) *
                          </label>
                          <input
                            type="text"
                            value={regSiren}
                            onChange={(e) => setRegSiren(e.target.value)}
                            placeholder="987654321"
                            maxLength={9}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Ville
                          </label>
                          <input
                            type="text"
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            placeholder="Paris"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Code Postal
                          </label>
                          <input
                            type="text"
                            value={regPostalCode}
                            onChange={(e) => setRegPostalCode(e.target.value)}
                            placeholder="75008"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          OPCO de rattachement (Prise en charge financière)
                        </label>
                        <select
                          value={regOpco}
                          onChange={(e) => setRegOpco(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="ATLAS">OPCO Atlas (Bureaux d'études, conseil, finance)</option>
                          <option value="OPCO_EP">OPCO EP (Entreprises de proximité)</option>
                          <option value="AKTO">AKTO (Services à forte intensité de main d'oeuvre)</option>
                          <option value="OPCOMMERCE">L'Opcommerce (Commerce et distribution)</option>
                          <option value="AUTRE">Autre / Financement Direct Entreprise</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Entreprise de rattachement</span>
                      </div>
                      <select
                        value={regCompanyId}
                        onChange={(e) => setRegCompanyId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                        required
                      >
                        {allCompanies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (SIREN: {c.siren})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">
                        Votre compte stagiaire sera rattaché au dossier conventionnel de cette entreprise.
                      </p>
                    </div>
                  )}

                  {/* Personal Identity Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="Jean"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="Valjean"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Email professionnel *
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="jean.valjean@entreprise.fr"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="06 12 34 56 78"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mot de passe (8 caractères minimum) *
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-300">Règle de sécurité Qualiopi :</span> Les rôles Formateur et Administrateur ne peuvent pas être auto-enregistrés. Ils sont créés exclusivement par l'administrateur de l'organisme.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Finaliser mon inscription</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-400">
                      Vous possédez déjà un compte ?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('login');
                          setErrorMessage(null);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2"
                      >
                        Se connecter
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>MK Formation · Matt Konnect SAS · N° Déclaration 11 75 00000 75</span>
        <span className="text-[11px] text-slate-600">
          Chiffrement SHA-256 · Traçabilité DGEFP · Qualiopi
        </span>
      </div>
    </div>
  );
};
