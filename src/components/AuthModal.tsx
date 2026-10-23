/**
 * MK Formation — Authentication & Self-Registration Modal
 * Features:
 * - Real PBKDF2/SHA-256 Login verification with session token generation
 * - Public Self-Registration for Enterprise Clients (RH) and Trainees (Beneficiaries)
 * - Security guard: Admin & Trainer roles cannot be self-registered (privilege escalation prevention)
 * - Quick-fill demo credentials for rapid testing
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import {
  Lock,
  Mail,
  User,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  KeyRound,
  GraduationCap,
} from 'lucide-react';

interface AuthModalProps {
  initialTab?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialTab = 'login',
  onClose,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
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
  const [regCompanyId, setRegCompanyId] = useState(allCompanies[0]?.id || '');

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    const success = appState.login(loginEmail.trim(), loginPassword);
    if (!success) {
      setErrorMessage(
        'Identifiants invalides ou compte inactif. Vérifiez votre adresse email et votre mot de passe.'
      );
      return;
    }

    onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
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
          setErrorMessage('La raison sociale de l’entreprise est obligatoire.');
          return;
        }
        const cleanSiren = regSiren.trim().replace(/\s/g, '');
        if (cleanSiren.length < 9) {
          setErrorMessage('Le numéro SIREN doit comporter au minimum 9 chiffres.');
          return;
        }

        appState.selfRegister({
          accountType: 'COMPANY_CLIENT',
          firstName: regFirstName,
          lastName: regLastName,
          email: regEmail,
          password: regPassword,
          phone: regPhone || undefined,
          companyName: regCompanyName,
          siren: cleanSiren,
          city: regCity || 'Paris',
          postalCode: regPostalCode || '75001',
        });
      } else {
        // BENEFICIARY
        if (!regCompanyId) {
          setErrorMessage('Veuillez sélectionner votre entreprise de rattachement.');
          return;
        }

        appState.selfRegister({
          accountType: 'BENEFICIARY',
          firstName: regFirstName,
          lastName: regLastName,
          email: regEmail,
          password: regPassword,
          phone: regPhone || undefined,
          companyId: regCompanyId,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors de l’inscription.');
    }
  };

  const fillQuickDemo = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-2xl my-8 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {tab === 'login' ? 'Connexion à MK Formation' : 'Créer un compte client ou stagiaire'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Plateforme certifiée et sécurisée de gestion des formations Matt Konnect.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center border-b border-slate-800 mt-4">
          <button
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors ${
              tab === 'login'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors ${
              tab === 'register'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Créer un compte (Inscription)
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-950/50 border border-rose-800 rounded text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="nom@entreprise.fr"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Se connecter</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Accounts Helper */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Comptes de test préconfigurés (1-clic) :
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('admin@mattkonnect.com', 'AdminPass2026!')}
                  className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded text-left transition-colors"
                >
                  <div className="font-semibold text-blue-400">Administrateur</div>
                  <div className="text-[10px] text-slate-400 truncate">admin@mattkonnect.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('sophie.formateur@mattkonnect.com', 'TrainerPass2026!')}
                  className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded text-left transition-colors"
                >
                  <div className="font-semibold text-emerald-400">Formateur</div>
                  <div className="text-[10px] text-slate-400 truncate">sophie.formateur@...</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('rh@acme-industries.fr', 'ClientPass2026!')}
                  className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded text-left transition-colors"
                >
                  <div className="font-semibold text-purple-400">Client RH (Acme)</div>
                  <div className="text-[10px] text-slate-400 truncate">rh@acme-industries.fr</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('lucas.martin@acme-industries.fr', 'LearnerPass2026!')}
                  className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded text-left transition-colors"
                >
                  <div className="font-semibold text-amber-400">Stagiaire (Lucas)</div>
                  <div className="text-[10px] text-slate-400 truncate">lucas.martin@...</div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Type de compte souhaité
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterType('COMPANY_CLIENT')}
                  className={`p-3 rounded border text-left transition-all ${
                    registerType === 'COMPANY_CLIENT'
                      ? 'bg-blue-950/60 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Entreprise & RH</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Accès portail client, conventions, facturation et suivi de vos salariés.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterType('BENEFICIARY')}
                  className={`p-3 rounded border text-left transition-all ${
                    registerType === 'BENEFICIARY'
                      ? 'bg-blue-950/60 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salarié / Stagiaire</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Accès émargements numériques, convocations et attestations de fin.
                  </div>
                </button>
              </div>
            </div>

            {/* Enterprise Fields */}
            {registerType === 'COMPANY_CLIENT' && (
              <div className="space-y-3 p-3 bg-slate-950/80 border border-slate-800 rounded">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Informations de l'entreprise</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Raison sociale de l'entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: InnovTech Group SAS"
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Numéro SIREN (9 chiffres) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="987654321"
                      value={regSiren}
                      onChange={(e) => setRegSiren(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Ville du siège
                    </label>
                    <input
                      type="text"
                      placeholder="Paris"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Beneficiary Attached Company Select */}
            {registerType === 'BENEFICIARY' && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Entreprise cliente de rattachement *
                </label>
                <select
                  value={regCompanyId}
                  onChange={(e) => setRegCompanyId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {allCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (SIREN: {c.siren})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Si votre entreprise n'apparaît pas, demandez à votre responsable RH de créer le compte entreprise au préalable.
                </p>
              </div>
            )}

            {/* Personal Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jean"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dupont"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adresse e-mail professionnelle *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jean.dupont@entreprise.fr"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Téléphone direct
                </label>
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mot de passe (8 caractères minimum) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-2.5 bg-blue-950/30 border border-blue-900/60 rounded text-[11px] text-blue-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
              <span>
                <strong>Protection des accès & conformité :</strong> Les comptes Administrateur et Formateur Matt Konnect ne sont pas ouverts à l’auto-inscription publique et sont strictement provisionnés en interne par l'administrateur.
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Créer mon compte et accéder à la plateforme</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
