/**
 * MK Formation — Sessions & Attendance Management View
 * Features: Session planning, trainee enrollments, automated convocation, and attendance sheets
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import {
  filterSessionsForUser,
  canMarkAttendance,
  canManageSession,
} from '../server/policy.ts';
import { TrainingSession, Enrollment, AttendanceRecord } from '../types/index.ts';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  Mail,
  Plus,
  Clock,
  MapPin,
  ShieldAlert,
  Award,
} from 'lucide-react';

interface SessionsViewProps {
  onOpenDocPreview: (docId: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({ onOpenDocPreview }) => {
  const user = appState.getCurrentUser();
  const allSessions = appState.getSessions();
  const allEnrollments = appState.getEnrollments();
  const allAttendance = appState.getAttendance();
  const allPrograms = appState.getPrograms();
  const allCompanies = appState.getCompanies();
  const allUsers = appState.getAllUsers();

  const userSessions = filterSessionsForUser(user, allSessions, allEnrollments);

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    userSessions.length > 0 ? userSessions[0].id : ''
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCompanyId, setEnrollCompanyId] = useState(allCompanies[0]?.id || '');
  const [enrollBeneficiaryId, setEnrollBeneficiaryId] = useState('');
  const [enrollError, setEnrollError] = useState('');

  // Form state for creating session
  const [newTitle, setNewTitle] = useState('');
  const [newRef, setNewRef] = useState(`SESS-${new Date().getFullYear()}-${String(allSessions.length + 1).padStart(3, '0')}`);
  const [newProgramId, setNewProgramId] = useState(allPrograms[0]?.id || '');
  const [newModality, setNewModality] = useState<'PRESENTIEL' | 'DISTANCIEL' | 'HYBRIDE'>('HYBRIDE');
  const [newStartDate, setNewStartDate] = useState('2026-04-10');
  const [newEndDate, setNewEndDate] = useState('2026-04-11');
  const [newLocation, setNewLocation] = useState('Campus Matt Konnect, 12 rue de la Paix, 75002 Paris');
  const [newMaxParticipants, setNewMaxParticipants] = useState(10);
  const [newTrainerId, setNewTrainerId] = useState(allUsers.find((u) => u.role === 'TRAINER')?.id || '');

  const activeSession = userSessions.find((s) => s.id === selectedSessionId) || userSessions[0];

  const activeEnrollments = activeSession
    ? allEnrollments.filter((e) => e.sessionId === activeSession.id)
    : [];

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = appState.createSession({
        referenceCode: newRef,
        programId: newProgramId,
        title: newTitle || 'Nouvelle Session de Formation',
        modality: newModality,
        startDate: newStartDate,
        endDate: newEndDate,
        location: newLocation,
        maxParticipants: Number(newMaxParticipants),
        trainerId: newTrainerId || user.id,
      });
      setShowCreateModal(false);
      setSelectedSessionId(created.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError('');
    try {
      if (!activeSession) return;
      if (!enrollBeneficiaryId) {
        setEnrollError('Veuillez sélectionner un bénéficiaire');
        return;
      }
      appState.enrollBeneficiary(activeSession.id, enrollBeneficiaryId, enrollCompanyId);
      setShowEnrollModal(false);
    } catch (err: any) {
      setEnrollError(err.message);
    }
  };

  const handleSendConvocation = (enrollmentId: string) => {
    try {
      const doc = appState.sendConvocation(enrollmentId);
      onOpenDocPreview(doc.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateConvention = () => {
    if (!activeSession) return;
    const firstCompanyId = activeEnrollments[0]?.companyId || allCompanies[0]?.id;
    if (!firstCompanyId) {
      alert('Aucune entreprise participante rattachée à cette session.');
      return;
    }
    const doc = appState.generateConvention(activeSession.id, firstCompanyId);
    onOpenDocPreview(doc.id);
  };

  const isAttendanceAuthorized = activeSession ? canMarkAttendance(user, activeSession) : false;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Sessions de Formation & Émargements
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Planification, convocations horodatées, gestion des présences et traçabilité pédagogique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageSession(user) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nouvelle Session
            </button>
          )}
        </div>
      </div>

      {userSessions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center">
          <p className="text-xs text-slate-400">Aucune session disponible pour votre profil.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Vos Sessions ({userSessions.length})
            </h2>
            <div className="space-y-2">
              {userSessions.map((session) => {
                const isSelected = activeSession?.id === session.id;
                const enrollmentsCount = allEnrollments.filter((e) => e.sessionId === session.id).length;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3.5 rounded border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{session.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {session.referenceCode}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{session.startDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{session.modality}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{enrollmentsCount}/{session.maxParticipants} inscrits</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Detail & Trainees / Attendance */}
          {activeSession && (
            <div className="lg:col-span-2 space-y-6">
              {/* Session Overview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                      {activeSession.referenceCode}
                    </span>
                    <h2 className="text-base font-bold text-white tracking-tight mt-1">
                      {activeSession.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {activeSession.startDate} au {activeSession.endDate}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {activeSession.location}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-slate-300">
                        Modalité : {activeSession.modality}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={handleGenerateConvention}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> Convention
                      </button>
                    )}
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => setShowEnrollModal(true)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" /> Inscrire un stagiaire
                      </button>
                    )}
                  </div>
                </div>

                {/* Trainees & Convocation Status */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Participants inscrits ({activeEnrollments.length} / {activeSession.maxParticipants})
                    </h3>
                  </div>

                  {activeEnrollments.length === 0 ? (
                    <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded text-center text-xs text-slate-500">
                      Aucun bénéficiaire inscrit pour le moment.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      {activeEnrollments.map((enr) => {
                        const ben = allUsers.find((u) => u.id === enr.beneficiaryId);
                        const comp = allCompanies.find((c) => c.id === enr.companyId);
                        return (
                          <div key={enr.id} className="py-2.5 flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-100">
                                  {ben ? `${ben.firstName} ${ben.lastName}` : 'Stagiaire'}
                                </span>
                                <span className="text-[11px] text-slate-400">· {comp?.name || 'Entreprise'}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Statut : {enr.status} {enr.convocationSentAt ? `(Convoqué le ${new Date(enr.convocationSentAt).toLocaleDateString('fr-FR')})` : ''}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {user.role === 'ADMIN' && (
                                <>
                                  <button
                                    onClick={() => handleSendConvocation(enr.id)}
                                    className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded flex items-center gap-1"
                                    title="Générer convocation officielle"
                                  >
                                    <Mail className="w-3 h-3" /> Convocation
                                  </button>
                                  <button
                                    onClick={() => {
                                      try {
                                        const doc = appState.generateCertificatRealisation(enr.id);
                                        onOpenDocPreview(doc.id);
                                      } catch (err: any) {
                                        alert(err.message);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded flex items-center gap-1"
                                    title="Générer certificat officiel DGEFP"
                                  >
                                    <Award className="w-3 h-3" /> Certificat
                                  </button>
                                  <button
                                    onClick={() => {
                                      try {
                                        const doc = appState.generateAttestationFin(enr.id);
                                        onOpenDocPreview(doc.id);
                                      } catch (err: any) {
                                        alert(err.message);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 rounded flex items-center gap-1"
                                    title="Générer attestation individuelle de fin de formation"
                                  >
                                    <FileText className="w-3 h-3" /> Attestation
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Sheet Card (Émargements) */}
              <div className="bg-slate-900 border border-slate-800 rounded p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Feuille d’émargement officielle
                    </h3>
                    <p className="text-xs text-slate-400">
                      Horodatage conforme aux exigences de suivi Qualiopi (Matin / Après-midi).
                    </p>
                  </div>
                  {!isAttendanceAuthorized && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Lecture seule (Réservé au formateur assigné / admin)
                    </span>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 font-medium">Bénéficiaire</th>
                        <th className="py-2 font-medium">Date</th>
                        <th className="py-2 font-medium">Matin (3h30)</th>
                        <th className="py-2 font-medium">Après-midi (3h30)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeEnrollments.map((enr) => {
                        const ben = allUsers.find((u) => u.id === enr.beneficiaryId);
                        const morningAtt = allAttendance.find(
                          (a) => a.sessionId === activeSession.id && a.beneficiaryId === enr.beneficiaryId && a.date === activeSession.startDate && a.period === 'MORNING'
                        );
                        const afternoonAtt = allAttendance.find(
                          (a) => a.sessionId === activeSession.id && a.beneficiaryId === enr.beneficiaryId && a.date === activeSession.startDate && a.period === 'AFTERNOON'
                        );

                        return (
                          <tr key={enr.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 font-medium text-slate-200">
                              {ben ? `${ben.firstName} ${ben.lastName}` : 'Stagiaire'}
                            </td>
                            <td className="py-2.5 text-slate-400 font-mono">
                              {activeSession.startDate}
                            </td>
                            <td className="py-2.5">
                              {isAttendanceAuthorized ? (
                                <button
                                  onClick={() =>
                                    appState.markAttendance(
                                      activeSession.id,
                                      enr.beneficiaryId,
                                      activeSession.startDate,
                                      'MORNING',
                                      !morningAtt?.present
                                    )
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
                                    morningAtt?.present
                                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {morningAtt?.present ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Émargé
                                    </>
                                  ) : (
                                    'Non émargé'
                                  )}
                                </button>
                              ) : (
                                <span className={`text-[11px] font-mono ${morningAtt?.present ? 'text-emerald-400' : 'text-slate-500'}`}>
                                  {morningAtt?.present ? 'Présent' : 'Non émargé'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5">
                              {isAttendanceAuthorized ? (
                                <button
                                  onClick={() =>
                                    appState.markAttendance(
                                      activeSession.id,
                                      enr.beneficiaryId,
                                      activeSession.startDate,
                                      'AFTERNOON',
                                      !afternoonAtt?.present
                                    )
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
                                    afternoonAtt?.present
                                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {afternoonAtt?.present ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Émargé
                                    </>
                                  ) : (
                                    'Non émargé'
                                  )}
                                </button>
                              ) : (
                                <span className={`text-[11px] font-mono ${afternoonAtt?.present ? 'text-emerald-400' : 'text-slate-500'}`}>
                                  {afternoonAtt?.present ? 'Présent' : 'Non émargé'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Session */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded max-w-lg w-full p-6 text-white shadow-2xl">
            <h3 className="text-sm font-bold tracking-tight mb-4">Planifier une nouvelle session</h3>
            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Titre de la session</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: Promotion Cybersécurité & OWASP - Avril 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Code référence</label>
                  <input
                    type="text"
                    required
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Modalité</label>
                  <select
                    value={newModality}
                    onChange={(e: any) => setNewModality(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  >
                    <option value="PRESENTIEL">Présentiel</option>
                    <option value="DISTANCIEL">Distanciel</option>
                    <option value="HYBRIDE">Hybride</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Programme de formation</label>
                <select
                  value={newProgramId}
                  onChange={(e) => setNewProgramId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                >
                  {allPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.referenceCode} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date début</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Date fin</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Lieu / Lien de visioconférence</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Capacité maximale</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newMaxParticipants}
                    onChange={(e) => setNewMaxParticipants(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Formateur assigné</label>
                  <select
                    value={newTrainerId}
                    onChange={(e) => setNewTrainerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  >
                    {allUsers
                      .filter((u) => u.role === 'TRAINER' || u.role === 'ADMIN')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                >
                  Créer la session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Beneficiary */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-sm font-bold tracking-tight mb-4">Inscrire un bénéficiaire</h3>
            {enrollError && (
              <div className="p-3 mb-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">
                {enrollError}
              </div>
            )}
            <form onSubmit={handleEnroll} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Entreprise cliente</label>
                <select
                  value={enrollCompanyId}
                  onChange={(e) => {
                    setEnrollCompanyId(e.target.value);
                    setEnrollBeneficiaryId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                >
                  {allCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (SIREN: {c.siren})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bénéficiaire à former</label>
                <select
                  required
                  value={enrollBeneficiaryId}
                  onChange={(e) => setEnrollBeneficiaryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                >
                  <option value="">-- Choisir un salarié --</option>
                  {allUsers
                    .filter((u) => u.companyId === enrollCompanyId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                >
                  Valider l’inscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
