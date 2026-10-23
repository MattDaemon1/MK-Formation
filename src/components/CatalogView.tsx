/**
 * MK Formation — Training Catalog & Program Versions View
 * Features: Full CRUD (Create, Edit All Data & Syllabus Modules, Versioning, Archive, Delete)
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { canManageCatalog } from '../server/policy.ts';
import { TrainingProgram, ProgramVersion, ProgramModule } from '../types/index.ts';
import {
  BookOpen,
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  Euro,
  Edit2,
  Trash2,
  AlertTriangle,
  History,
  Archive,
  Check,
  X,
  PlusCircle,
} from 'lucide-react';

interface EditableModule {
  id: string;
  title: string;
  duration: string;
  topicsStr: string;
}

export const CatalogView: React.FC = () => {
  const user = appState.getCurrentUser();
  const programs = appState.getPrograms();
  const versions = appState.getProgramVersions();
  const isManager = canManageCatalog(user);

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    programs.length > 0 ? programs[0].id : ''
  );

  const activeProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];
  const programVersions = activeProgram
    ? versions.filter((v) => v.programId === activeProgram.id)
    : [];

  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    activeProgram?.currentVersionId || (programVersions[0]?.id ?? '')
  );

  const activeVersion =
    programVersions.find((v) => v.id === selectedVersionId) || programVersions[0];

  // Feedback notifications
  const [notice, setNotice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit Tab State (Infos vs Syllabus)
  const [editTab, setEditTab] = useState<'GENERAL' | 'PEDAGOGY' | 'MODULES'>('GENERAL');

  // Form states: Create Program
  const [newTitle, setNewTitle] = useState('');
  const [newRef, setNewRef] = useState(`MK-PROG-${String(programs.length + 1).padStart(2, '0')}`);
  const [newCategory, setNewCategory] = useState('Développement & Cybersécurité');
  const [newSummary, setNewSummary] = useState('');
  const [newHours, setNewHours] = useState(14);
  const [newDays, setNewDays] = useState(2);
  const [newPriceEuros, setNewPriceEuros] = useState('1800.00');
  const [newObjectives, setNewObjectives] = useState(
    'Maîtriser les concepts fondamentaux\nAppliquer les bonnes pratiques d’ingénierie logicielle\nIdentifier et corriger les vulnérabilités'
  );
  const [newPrerequisites, setNewPrerequisites] = useState('Expérience en programmation web');
  const [newTargetAudience, setNewTargetAudience] = useState('Développeurs, Chefs de projets techniques');
  const [newModules, setNewModules] = useState<EditableModule[]>([
    { id: '1', title: 'Module 1 : Fondamentaux & Principes Clés', duration: '3h30', topicsStr: 'Concepts théoriques, Méthodologie, Bonnes pratiques' },
    { id: '2', title: 'Module 2 : Mise en Pratique & Ateliers', duration: '3h30', topicsStr: 'Études de cas, Travaux dirigés, Débogage' },
  ]);

  // Form states: Edit Program & Active Version (Comprehensive)
  const [editTitle, setEditTitle] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editHours, setEditHours] = useState(14);
  const [editDays, setEditDays] = useState(2);
  const [editPriceEuros, setEditPriceEuros] = useState('1800.00');
  const [editObjectives, setEditObjectives] = useState('');
  const [editPrerequisites, setEditPrerequisites] = useState('');
  const [editTargetAudience, setEditTargetAudience] = useState('');
  const [editModules, setEditModules] = useState<EditableModule[]>([]);

  // Form states: New Program Version (Qualiopi)
  const [vChangelog, setVChangelog] = useState('');
  const [vHours, setVHours] = useState(14);
  const [vDays, setVDays] = useState(2);
  const [vPriceEuros, setVPriceEuros] = useState('1800.00');
  const [vObjectives, setVObjectives] = useState('');
  const [vPrerequisites, setVPrerequisites] = useState('');
  const [vTargetAudience, setVTargetAudience] = useState('');

  const formatEuro = (cents: number) => {
    return (
      (cents / 100).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' €'
    );
  };

  const handleOpenEdit = () => {
    if (!activeProgram || !activeVersion) return;
    setEditTitle(activeProgram.title);
    setEditRef(activeProgram.referenceCode);
    setEditCategory(activeProgram.category);
    setEditSummary(activeProgram.summary);
    setEditActive(activeProgram.active);

    // Version details
    setEditHours(activeVersion.durationHours);
    setEditDays(activeVersion.durationDays);
    setEditPriceEuros((activeVersion.priceHtCents / 100).toFixed(2));
    setEditObjectives(activeVersion.objectives.join('\n'));
    setEditPrerequisites(activeVersion.prerequisites.join(', '));
    setEditTargetAudience(activeVersion.targetAudience.join(', '));

    // Modules
    setEditModules(
      activeVersion.modules.map((m, idx) => ({
        id: String(idx + 1),
        title: m.title,
        duration: m.duration,
        topicsStr: m.topics.join(', '),
      }))
    );

    setEditTab('GENERAL');
    setErrorMessage('');
    setShowEditModal(true);
  };

  const handleAddEditModule = () => {
    setEditModules([
      ...editModules,
      {
        id: String(Date.now()),
        title: `Module ${editModules.length + 1} : Nouveau module`,
        duration: '3h30',
        topicsStr: 'Points clés abordés, Travaux pratiques',
      },
    ]);
  };

  const handleRemoveEditModule = (id: string) => {
    if (editModules.length <= 1) {
      alert('Une formation doit comporter au moins un module pédagogique.');
      return;
    }
    setEditModules(editModules.filter((m) => m.id !== id));
  };

  const handleUpdateEditModule = (id: string, field: 'title' | 'duration' | 'topicsStr', value: string) => {
    setEditModules(
      editModules.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleOpenNewVersion = () => {
    if (!activeVersion) return;
    setVChangelog(`Version ${programVersions.length + 1} — Actualisation pédagogique`);
    setVHours(activeVersion.durationHours);
    setVDays(activeVersion.durationDays);
    setVPriceEuros((activeVersion.priceHtCents / 100).toFixed(2));
    setVObjectives(activeVersion.objectives.join('\n'));
    setVPrerequisites(activeVersion.prerequisites.join(', '));
    setVTargetAudience(activeVersion.targetAudience.join(', '));
    setShowNewVersionModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const priceCents = Math.round(parseFloat(newPriceEuros.replace(',', '.')) * 100);
      if (isNaN(priceCents) || priceCents <= 0) {
        throw new Error('Veuillez saisir un tarif HT valide');
      }

      const objList = newObjectives
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      const parsedModules: ProgramModule[] = newModules.map((m) => ({
        title: m.title.trim(),
        duration: m.duration.trim(),
        topics: m.topicsStr.split(',').map((t) => t.trim()).filter(Boolean),
      }));

      const created = appState.createProgram({
        title: newTitle,
        referenceCode: newRef,
        category: newCategory,
        summary: newSummary,
        durationHours: Number(newHours),
        durationDays: Number(newDays),
        priceHtCents: priceCents,
        objectives: objList,
        prerequisites: [newPrerequisites],
        targetAudience: [newTargetAudience],
        modules: parsedModules,
      });

      setShowCreateModal(false);
      setSelectedProgramId(created.id);
      setSelectedVersionId(created.currentVersionId);
      setNotice(`Formation "${created.title}" créée avec succès dans le catalogue.`);
      // Reset form
      setNewTitle('');
      setNewSummary('');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!activeProgram || !activeVersion) return;

    try {
      // 1. Update basic program info
      const updatedProg = appState.updateProgram({
        id: activeProgram.id,
        title: editTitle,
        referenceCode: editRef,
        category: editCategory,
        summary: editSummary,
        active: editActive,
      });

      // 2. Update active version details & modules
      const priceCents = Math.round(parseFloat(editPriceEuros.replace(',', '.')) * 100);
      const objList = editObjectives
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      const parsedModules: ProgramModule[] = editModules.map((m) => ({
        title: m.title.trim() || 'Module de formation',
        duration: m.duration.trim() || '3h30',
        topics: m.topicsStr.split(',').map((t) => t.trim()).filter(Boolean),
      }));

      appState.updateProgramVersion({
        versionId: activeVersion.id,
        durationHours: Number(editHours),
        durationDays: Number(editDays),
        priceHtCents: priceCents,
        objectives: objList.length > 0 ? objList : activeVersion.objectives,
        prerequisites: editPrerequisites.split(',').map((p) => p.trim()).filter(Boolean),
        targetAudience: editTargetAudience.split(',').map((t) => t.trim()).filter(Boolean),
        modules: parsedModules,
      });

      setShowEditModal(false);
      setNotice(`Fiche de formation "${updatedProg.referenceCode}" et ses modules mis à jour avec succès.`);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleNewVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!activeProgram) return;

    try {
      const priceCents = Math.round(parseFloat(vPriceEuros.replace(',', '.')) * 100);
      const objList = vObjectives
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      const newVer = appState.createProgramVersion({
        programId: activeProgram.id,
        changelogNotes: vChangelog,
        durationHours: Number(vHours),
        durationDays: Number(vDays),
        priceHtCents: priceCents,
        objectives: objList.length > 0 ? objList : activeVersion?.objectives || [],
        prerequisites: [vPrerequisites],
        targetAudience: [vTargetAudience],
        evaluationMethods: activeVersion?.evaluationMethods || ['QCM d’évaluation des acquis'],
        pedagogicalMeans: activeVersion?.pedagogicalMeans || ['Supports numériques et ateliers pratiques'],
        modules: activeVersion?.modules || [],
      });

      setShowNewVersionModal(false);
      setSelectedVersionId(newVer.id);
      setNotice(`Nouvelle version v${newVer.versionNumber} publiée pour "${activeProgram.title}".`);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteSubmit = () => {
    setErrorMessage('');
    if (!activeProgram) return;

    try {
      appState.deleteProgram(activeProgram.id);
      setShowDeleteModal(false);
      const remaining = appState.getPrograms();
      if (remaining.length > 0) {
        setSelectedProgramId(remaining[0].id);
        setSelectedVersionId(remaining[0].currentVersionId);
      } else {
        setSelectedProgramId('');
      }
      setNotice('La formation a été supprimée du catalogue.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleToggleActive = () => {
    if (!activeProgram) return;
    try {
      const updated = appState.toggleProgramActive(activeProgram.id);
      setNotice(
        `La formation est désormais ${updated.active ? 'active au catalogue' : 'archivée / inactive'}.`
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Catalogue des Formations & Programmes Versionnés
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Référentiel pédagogique Matt Konnect, objectifs opérationnels et versionnage Qualiopi (Indicateur 1).
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => {
              setErrorMessage('');
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une formation
          </button>
        )}
      </div>

      {notice && (
        <div className="p-3 bg-blue-950/50 border border-blue-800 text-blue-200 rounded text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-blue-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center text-xs text-slate-500">
          Le catalogue ne contient aucune formation pour le moment.
          {isManager && (
            <div className="mt-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium"
              >
                Créer la première formation
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Programs List */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Formations au catalogue ({programs.length})
            </h2>
            <div className="space-y-2">
              {programs.map((prog) => {
                const isSelected = activeProgram?.id === prog.id;
                const versCount = versions.filter((v) => v.programId === prog.id).length;
                return (
                  <button
                    key={prog.id}
                    onClick={() => {
                      setSelectedProgramId(prog.id);
                      setSelectedVersionId(prog.currentVersionId);
                      setNotice('');
                    }}
                    className={`w-full text-left p-3.5 rounded border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{prog.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {prog.referenceCode}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span>{prog.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{versCount} v.</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          prog.active
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {prog.active ? 'Actif' : 'Archivé'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Program & Version View */}
          {activeProgram && activeVersion && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded p-5">
                {/* Program Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                        {activeProgram.referenceCode}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Version active : v{activeVersion.versionNumber}
                      </span>
                      {!activeProgram.active && (
                        <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                          Archivé (invisible aux nouveaux devis)
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight mt-1">
                      {activeProgram.title}
                    </h2>
                    <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                      {activeProgram.summary}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold font-mono tabular-nums text-white">
                      {formatEuro(activeVersion.priceHtCents)}{' '}
                      <span className="text-xs font-normal text-slate-400">HT</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {activeVersion.durationHours} heures · {activeVersion.durationDays} jours
                    </div>
                  </div>
                </div>

                {/* Manager Actions Bar */}
                {isManager && (
                  <div className="py-2.5 px-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenEdit}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" /> Modifier toute la fiche & modules
                      </button>
                      <button
                        onClick={handleOpenNewVersion}
                        className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 border border-blue-700/60 rounded flex items-center gap-1 transition-colors"
                        title="Créer une nouvelle version du programme (Qualiopi - Indicateur 1)"
                      >
                        <History className="w-3 h-3 text-blue-300" /> Nouvelle version (v{programVersions.length + 1})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleActive}
                        className={`px-2.5 py-1 rounded border flex items-center gap-1 transition-colors ${
                          activeProgram.active
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        {activeProgram.active ? 'Archiver' : 'Réactiver'}
                      </button>
                      <button
                        onClick={() => {
                          setErrorMessage('');
                          setShowDeleteModal(true);
                        }}
                        className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Supprimer
                      </button>
                    </div>
                  </div>
                )}

                {/* Version History Selector */}
                <div className="mt-4 flex items-center gap-2 pb-4 border-b border-slate-800">
                  <span className="text-xs text-slate-400">Historique des versions :</span>
                  <div className="flex items-center gap-1.5">
                    {programVersions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionId(v.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded border ${
                          activeVersion.id === v.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        v{v.versionNumber}
                      </button>
                    ))}
                  </div>
                  {activeVersion.changelogNotes && (
                    <span className="text-[11px] text-slate-400 italic ml-2 truncate">
                      « {activeVersion.changelogNotes} »
                    </span>
                  )}
                </div>

                {/* Pedagogical Specification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3.5">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                      Objectifs opérationnels
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeVersion.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3.5">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                      Prérequis & Public cible
                    </h3>
                    <div className="space-y-3 text-xs text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-400 block mb-1">Prérequis :</span>
                        {activeVersion.prerequisites.join(', ')}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400 block mb-1">Public visé :</span>
                        {activeVersion.targetAudience.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Syllabus Modules */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Découpage pédagogique par module ({activeVersion.modules.length})
                    </h3>
                    {isManager && (
                      <button
                        onClick={handleOpenEdit}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Modifier les modules
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {activeVersion.modules.map((mod, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/40 border border-slate-800 rounded"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                          <span>{mod.title}</span>
                          <span className="text-[11px] font-mono text-slate-400">{mod.duration}</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-2">
                          {mod.topics.map((t, ti) => (
                            <span
                              key={ti}
                              className="text-[11px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create Program */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">Ajouter une formation au catalogue</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Code référence</label>
                  <input
                    type="text"
                    required
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    placeholder="ex: MK-DEV-02"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Titre de la formation</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="ex: Architecture Microservices & Sécurité des APIs"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Catégorie / Thématique</label>
                <input
                  type="text"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="ex: Développement Web & Cloud"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Résumé pédagogique</label>
                <textarea
                  required
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Courte description synthétique des compétences et acquis visés..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Durée (heures)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Durée (jours)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tarif (€ HT)</label>
                  <input
                    type="text"
                    required
                    value={newPriceEuros}
                    onChange={(e) => setNewPriceEuros(e.target.value)}
                    placeholder="1800.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Objectifs opérationnels (1 par ligne)
                </label>
                <textarea
                  rows={3}
                  value={newObjectives}
                  onChange={(e) => setNewObjectives(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Prérequis</label>
                  <input
                    type="text"
                    value={newPrerequisites}
                    onChange={(e) => setNewPrerequisites(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Public visé</label>
                  <input
                    type="text"
                    value={newTargetAudience}
                    onChange={(e) => setNewTargetAudience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Modules in Create Modal */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">
                    Découpage initial des modules ({newModules.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewModules([
                        ...newModules,
                        {
                          id: String(Date.now()),
                          title: `Module ${newModules.length + 1} : Nouveau module`,
                          duration: '3h30',
                          topicsStr: 'Points clés abordés, Ateliers pratiques',
                        },
                      ])
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Ajouter un module
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newModules.map((m, idx) => (
                    <div key={m.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={m.title}
                          onChange={(e) =>
                            setNewModules(
                              newModules.map((item) => (item.id === m.id ? { ...item, title: e.target.value } : item))
                            )
                          }
                          placeholder="Titre du module"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={m.duration}
                          onChange={(e) =>
                            setNewModules(
                              newModules.map((item) => (item.id === m.id ? { ...item, duration: e.target.value } : item))
                            )
                          }
                          placeholder="Durée (ex: 3h30)"
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs font-mono"
                        />
                        {newModules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewModules(newModules.filter((item) => item.id !== m.id))}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={m.topicsStr}
                        onChange={(e) =>
                          setNewModules(
                            newModules.map((item) => (item.id === m.id ? { ...item, topicsStr: e.target.value } : item))
                          )
                        }
                        placeholder="Points abordés (séparés par des virgules)"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-300 text-[11px]"
                      />
                    </div>
                  ))}
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
                  Créer et publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Comprehensive Edit Program & Syllabus Modules */}
      {showEditModal && activeProgram && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Modifier la fiche complète : {activeProgram.referenceCode}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toutes les rubriques, y compris les objectifs et le découpage modulaire, sont modifiables.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs for clarity */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setEditTab('GENERAL')}
                className={`px-3 py-1 rounded transition-colors ${
                  editTab === 'GENERAL'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                1. Infos générales & Tarifs
              </button>
              <button
                type="button"
                onClick={() => setEditTab('PEDAGOGY')}
                className={`px-3 py-1 rounded transition-colors ${
                  editTab === 'PEDAGOGY'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                2. Objectifs & Prérequis
              </button>
              <button
                type="button"
                onClick={() => setEditTab('MODULES')}
                className={`px-3 py-1 rounded transition-colors ${
                  editTab === 'MODULES'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                3. Découpage par module ({editModules.length})
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* TAB 1: General Info */}
              {editTab === 'GENERAL' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Code référence</label>
                      <input
                        type="text"
                        required
                        value={editRef}
                        onChange={(e) => setEditRef(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 mb-1">Titre de la formation</label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Catégorie</label>
                    <input
                      type="text"
                      required
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Résumé</label>
                    <textarea
                      required
                      rows={2}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Durée (heures)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={editHours}
                        onChange={(e) => setEditHours(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Durée (jours)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={editDays}
                        onChange={(e) => setEditDays(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Tarif (€ HT)</label>
                      <input
                        type="text"
                        required
                        value={editPriceEuros}
                        onChange={(e) => setEditPriceEuros(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="activeCheck"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-blue-600"
                    />
                    <label htmlFor="activeCheck" className="text-slate-300 cursor-pointer">
                      Formation active au catalogue (visible pour les nouvelles sessions et devis)
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Pedagogy & Objectives */}
              {editTab === 'PEDAGOGY' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Objectifs opérationnels (1 objectif par ligne)
                    </label>
                    <textarea
                      rows={5}
                      value={editObjectives}
                      onChange={(e) => setEditObjectives(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Prérequis</label>
                      <input
                        type="text"
                        value={editPrerequisites}
                        onChange={(e) => setEditPrerequisites(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Public visé</label>
                      <input
                        type="text"
                        value={editTargetAudience}
                        onChange={(e) => setEditTargetAudience(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Syllabus Modules Editor */}
              {editTab === 'MODULES' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs">
                      Modifiez les intitulés, volumes horaires et points clés du programme.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddEditModule}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter un module
                    </button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {editModules.map((m, idx) => (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px] w-6">#{idx + 1}</span>
                          <input
                            type="text"
                            required
                            value={m.title}
                            onChange={(e) => handleUpdateEditModule(m.id, 'title', e.target.value)}
                            placeholder="Titre du module (ex: Module 1 : Fondamentaux)"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs"
                          />
                          <input
                            type="text"
                            required
                            value={m.duration}
                            onChange={(e) => handleUpdateEditModule(m.id, 'duration', e.target.value)}
                            placeholder="Durée (ex: 3h30)"
                            className="w-24 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditModule(m.id)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Supprimer ce module"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={m.topicsStr}
                            onChange={(e) => handleUpdateEditModule(m.id, 'topicsStr', e.target.value)}
                            placeholder="Points clés abordés (séparés par des virgules, ex: Sécurité, OWASP Top 10, Injection)"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-300 text-[11px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <div className="text-slate-400 text-[11px]">
                  {editTab === 'GENERAL' && '1/3 — Cliquez sur les onglets ci-dessus pour accéder aux modules.'}
                  {editTab === 'PEDAGOGY' && '2/3 — Renseignez les compétences et prérequis attendus.'}
                  {editTab === 'MODULES' && '3/3 — Définissez les modules pédagogiques.'}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    Enregistrer toutes les modifications
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: New Program Version (Qualiopi) */}
      {showNewVersionModal && activeProgram && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Publier la version v{programVersions.length + 1} du programme
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conforme Qualiopi (Indicateur 1) : Les versions précédentes restent figées pour les sessions passées.
                </p>
              </div>
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleNewVersionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Notes de révision / Changelog</label>
                <input
                  type="text"
                  required
                  value={vChangelog}
                  onChange={(e) => setVChangelog(e.target.value)}
                  placeholder="ex: Actualisation du programme 2026 et nouveaux travaux pratiques"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Durée (heures)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={vHours}
                    onChange={(e) => setVHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Durée (jours)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={vDays}
                    onChange={(e) => setVDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tarif (€ HT)</label>
                  <input
                    type="text"
                    required
                    value={vPriceEuros}
                    onChange={(e) => setVPriceEuros(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Objectifs opérationnels (1 par ligne)
                </label>
                <textarea
                  rows={4}
                  value={vObjectives}
                  onChange={(e) => setVObjectives(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Prérequis</label>
                  <input
                    type="text"
                    value={vPrerequisites}
                    onChange={(e) => setVPrerequisites(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Public visé</label>
                  <input
                    type="text"
                    value={vTargetAudience}
                    onChange={(e) => setVTargetAudience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                >
                  Publier la version v{programVersions.length + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {showDeleteModal && activeProgram && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Confirmer la suppression</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous certain de vouloir supprimer définitivement la formation{' '}
              <strong className="text-white">« {activeProgram.title} »</strong> (
              <span className="font-mono text-slate-400">{activeProgram.referenceCode}</span>) ainsi que tout son historique de versions ?
            </p>

            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded text-xs leading-relaxed">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
