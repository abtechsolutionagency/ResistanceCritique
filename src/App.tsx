/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldAlert, Info, Settings2, Calculator, Plus, Trash2, Home } from 'lucide-react';

const BREAKER_RATINGS = [6, 10, 16, 20, 32, 63];
const CABLE_SECTIONS = [1.5, 2.5, 4, 6, 10, 16];
const COPPER_RESISTIVITY = 0.017; // Ω·mm²/m (at 20°C standard)

interface Appliance {
  id: string;
  name: string;
  power: number;
  hours: number;
  emoji: string;
}

export default function App() {
  const [selectedBreaker, setSelectedBreaker] = useState<number>(16);
  const [voltage, setVoltage] = useState<number>(230);
  const [measuredResistance, setMeasuredResistance] = useState<number | string>('');
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'threshold' | 'icc' | 'consumption'>('threshold');

  // Icc Calculator State
  const [cableLength, setCableLength] = useState<number>(20);
  const [selectedSection, setSelectedSection] = useState<number>(2.5);

  // Consumption Calculator State
  const [kwhPrice, setKwhPrice] = useState<number>(0.25);
  const [appliances, setAppliances] = useState<Appliance[]>([
    { id: '1', name: 'Réfrigérateur', power: 150, hours: 0, emoji: '❄️' },
    { id: '2', name: 'Télévision', power: 100, hours: 0, emoji: '📺' },
    { id: '3', name: 'PC', power: 200, hours: 0, emoji: '💻' },
    { id: '4', name: 'Sèche-linge', power: 2500, hours: 0, emoji: '👕' },
    { id: '5', name: 'Lave-linge', power: 2000, hours: 0, emoji: '🧼' },
    { id: '6', name: 'Switch', power: 10, hours: 0, emoji: '🔌' },
    { id: '7', name: 'Caméra', power: 5, hours: 0, emoji: '📹' },
    { id: '8', name: 'Box Internet', power: 15, hours: 0, emoji: '📡' },
    { id: '9', name: 'Capteur lampe', power: 1, hours: 0, emoji: '💡' },
  ]);
  const [newAppliance, setNewAppliance] = useState({ name: '', power: '', hours: '0', emoji: '🔌' });

  const minResistance = useMemo(() => {
    if (selectedBreaker <= 0) return Infinity;
    return Number((voltage / selectedBreaker).toFixed(3));
  }, [selectedBreaker, voltage]);

  const maxPower = useMemo(() => {
    return Number((voltage * selectedBreaker).toFixed(0));
  }, [selectedBreaker, voltage]);

  const measuredPower = useMemo(() => {
    const res = Number(measuredResistance);
    if (!res || res <= 0) return 0;
    return Number(((voltage * voltage) / res).toFixed(0));
  }, [measuredResistance, voltage]);

  const measuredCurrent = useMemo(() => {
    const res = Number(measuredResistance);
    if (!res || res <= 0) return 0;
    return Number((voltage / res).toFixed(4));
  }, [measuredResistance, voltage]);

  const iccResult = useMemo(() => {
    // R = rho * (2 * L) / S
    const resistance = (COPPER_RESISTIVITY * (2 * cableLength)) / selectedSection;
    const icc = voltage / resistance;
    // Chute de tension (Voltage Drop) = R * I (using selected breaker current)
    const voltageDrop = resistance * selectedBreaker;
    const voltageDropPercent = (voltageDrop / voltage) * 100;

    return {
      resistance: Number(resistance.toFixed(4)),
      icc: Number(icc.toFixed(2)),
      voltageDrop: Number(voltageDrop.toFixed(2)),
      voltageDropPercent: Number(voltageDropPercent.toFixed(2))
    };
  }, [cableLength, selectedSection, voltage, selectedBreaker]);

  const consumptionTotals = useMemo(() => {
    const dailyWh = appliances.reduce((sum, app) => sum + (app.power * app.hours), 0);
    const dailyKWh = dailyWh / 1000;
    const monthlyKWh = dailyKWh * 30;
    const yearlyKWh = dailyKWh * 365;
    
    const dailyCost = dailyKWh * kwhPrice;
    const monthlyCost = monthlyKWh * kwhPrice;
    const yearlyCost = yearlyKWh * kwhPrice;

    return { dailyKWh, monthlyKWh, yearlyKWh, dailyCost, monthlyCost, yearlyCost };
  }, [appliances, kwhPrice]);

  const addAppliance = () => {
    if (newAppliance.name && newAppliance.power && newAppliance.hours) {
      setAppliances([
        ...appliances,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: newAppliance.name,
          power: Number(newAppliance.power),
          hours: Number(newAppliance.hours),
          emoji: newAppliance.emoji || '🔌',
        },
      ]);
      setNewAppliance({ name: '', power: '', hours: '0', emoji: '🔌' });
    }
  };

  const removeAppliance = (id: string) => {
    setAppliances(appliances.filter((app) => app.id !== id));
  };

  const updateApplianceHours = (id: string, hours: number) => {
    setAppliances(appliances.map(app => app.id === id ? { ...app, hours } : app));
  };

  const diagnostic = useMemo(() => {
    const res = Number(measuredResistance);
    if (measuredResistance === '' || isNaN(res)) return null;
    
    if (res <= 3) {
      return {
        status: 'SURINTENSITÉ DE COURT-CIRCUIT',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        message: "Danger immédiat ! La résistance est trop faible (≤ 3Ω)."
      };
    } else if (res < minResistance) {
      return {
        status: 'DÉFAUT DE SURINTENSITÉ DE SURCHARGE',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        message: `Risque de surcharge (< ${minResistance === Infinity ? '∞' : minResistance}Ω).`
      };
    } else {
      return {
        status: 'CIRCUIT OK (FONCTIONNEMENT NORMAL)',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        message: "Installation conforme."
      };
    }
  }, [measuredResistance, minResistance]);

  return (
    <div className="min-h-screen bg-bg-theme text-text-main font-sans flex flex-col justify-center items-center p-4 gap-4">
      <div className="w-full max-w-[900px] md:h-[650px] bg-white rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] grid grid-cols-1 md:grid-cols-[420px_1fr] overflow-hidden border border-border-theme">
        
        {/* Left Panel: Controls */}
        <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-border-theme flex flex-col relative overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex gap-1 p-1 bg-bg-theme rounded-xl mb-8">
            <button 
              onClick={() => setActiveTab('threshold')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                activeTab === 'threshold' 
                  ? 'bg-white shadow-sm text-indigo-600' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${activeTab === 'threshold' ? 'text-indigo-600' : ''}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Seuil</span>
            </button>
            <button 
              onClick={() => setActiveTab('icc')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                activeTab === 'icc' 
                  ? 'bg-white shadow-sm text-cyan-600' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Calculator className={`w-4 h-4 ${activeTab === 'icc' ? 'text-cyan-600' : ''}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Icc</span>
            </button>
            <button 
              onClick={() => setActiveTab('consumption')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                activeTab === 'consumption' 
                  ? 'bg-white shadow-sm text-orange-600' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeTab === 'consumption' ? 'text-orange-600' : ''}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Conso</span>
            </button>
          </div>

          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'consumption' && (
                <motion.div 
                  key="consumption-panel"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="absolute inset-0 bg-white flex flex-col"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold tracking-tight text-orange-600">Consommation</h2>
                  </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6">
                  {appliances.map((app) => (
                    <div key={app.id} className="p-3 bg-bg-theme rounded-lg border border-border-theme group space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{app.emoji}</span>
                          <div>
                            <div className="font-bold text-sm">{app.name}</div>
                            <div className="text-[10px] text-text-muted uppercase tracking-wider">
                              {app.power}W × {app.hours}h/j = {(app.power * app.hours / 1000).toFixed(2)} kWh
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeAppliance(app.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range"
                          min="0"
                          max="24"
                          step="0.5"
                          value={app.hours}
                          onChange={(e) => updateApplianceHours(app.id, Number(e.target.value))}
                          className="flex-1 h-1 bg-border-theme rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <span className="text-[10px] font-mono font-bold text-orange-600 w-8 text-right">{app.hours}h</span>
                      </div>
                    </div>
                  ))}

                  <div className="p-4 bg-accent-blue/5 rounded-lg border border-dashed border-accent-blue/30 space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="⚡"
                        value={newAppliance.emoji}
                        onChange={(e) => setNewAppliance({ ...newAppliance, emoji: e.target.value })}
                        className="w-12 bg-white border border-border-theme rounded px-2 py-2 text-center outline-none focus:border-accent-blue"
                      />
                      <input 
                        type="text"
                        placeholder="Appareil (ex: Four)"
                        value={newAppliance.name}
                        onChange={(e) => setNewAppliance({ ...newAppliance, name: e.target.value })}
                        className="flex-1 bg-white border border-border-theme rounded px-3 py-2 text-xs outline-none focus:border-accent-blue"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="number"
                        placeholder="Puissance (W)"
                        value={newAppliance.power}
                        onChange={(e) => setNewAppliance({ ...newAppliance, power: e.target.value })}
                        className="bg-white border border-border-theme rounded px-3 py-2 text-xs outline-none focus:border-accent-blue"
                      />
      <input 
        type="number"
        placeholder="Heures/jour"
        min="0"
        max="24"
        step="0.5"
        value={newAppliance.hours}
        onChange={(e) => setNewAppliance({ ...newAppliance, hours: e.target.value })}
        className="bg-white border border-border-theme rounded px-3 py-2 text-xs outline-none focus:border-accent-blue"
      />
                    </div>
                    <button 
                      onClick={addAppliance}
                      className="w-full py-2 bg-accent-blue text-white rounded font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3 h-3" /> Ajouter
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-theme space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-text-muted uppercase">Prix du kWh (€)</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={kwhPrice}
                      onChange={(e) => setKwhPrice(Number(e.target.value))}
                      className="w-20 bg-bg-theme border border-border-theme rounded px-2 py-1 text-xs font-mono font-bold text-accent-blue text-right outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-text-muted uppercase">Coût Mensuel</span>
                    <span className="font-mono font-bold text-accent-blue">{consumptionTotals.monthlyCost.toFixed(2)} €/mois</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-text-muted uppercase">Coût Annuel</span>
                    <span className="font-mono font-bold text-accent-blue">{consumptionTotals.yearlyCost.toFixed(2)} €/an</span>
                  </div>
                </div>
              </motion.div>
            )}

              {activeTab === 'icc' && (
                <motion.div 
                  key="icc-panel"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="absolute inset-0 bg-white flex flex-col"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-cyan-600">Calculateur court circuit câble</h2>
                  </div>

                  <div className="space-y-6 overflow-y-auto pr-2">
                    <div>
                      <span className="block text-[11px] uppercase tracking-widest text-text-muted mb-3 font-bold">Section du Câble (mm²)</span>
                      <div className="grid grid-cols-3 gap-2">
                        {CABLE_SECTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSection(s)}
                            className={`py-2 rounded text-[11px] font-bold transition-all border ${
                              selectedSection === s
                                ? 'bg-cyan-600 text-white border-cyan-600'
                                : 'bg-white border-border-theme text-text-muted hover:border-text-muted'
                            }`}
                          >
                            {s} mm²
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] uppercase tracking-widest text-text-muted font-bold">Longueur Aller (m)</span>
                        <span className="text-lg font-bold text-cyan-600 font-mono">{cableLength} m</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="200"
                        value={cableLength}
                        onChange={(e) => setCableLength(Number(e.target.value))}
                        className="w-full h-1.5 bg-border-theme rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                      <p className="text-[10px] text-text-muted mt-2 italic">
                        Note : Le calcul inclut automatiquement l'aller et le retour (Total : {cableLength * 2}m).
                      </p>
                    </div>

                    <div className="pt-6 border-t border-border-theme space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-text-muted uppercase">Résistance Câble</span>
                        <span className="font-mono font-bold text-text-main">{iccResult.resistance} Ω</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-text-muted uppercase">Chute de Tension</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-text-main block">{iccResult.voltageDrop} V</span>
                          <span className="text-[10px] text-text-muted">({iccResult.voltageDropPercent}%)</span>
                        </div>
                      </div>

                      <div className="p-4 bg-cyan-600/5 rounded-lg border border-cyan-600/10">
                        <span className="block text-[10px] font-bold text-cyan-600 uppercase mb-1">Courant de Court-Circuit (Icc)</span>
                        <span className="text-3xl font-bold text-cyan-600 font-mono">{iccResult.icc.toLocaleString('fr-FR')} A</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'threshold' && (
                <motion.div 
                  key="threshold-panel"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col justify-between h-full"
                >
                  <div className="space-y-8">
                    <div>
                      <div className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px] mb-4 tracking-wider">
                        SÉCURITÉ ÉLECTRIQUE
                      </div>
                      <h1 className="text-2xl font-bold tracking-tight mb-2">Seuil de Résistance</h1>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] uppercase tracking-widest text-text-muted font-bold">Calibre (A)</span>
                        <span className="text-xl font-bold text-indigo-600 font-mono">{selectedBreaker} A</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="63"
                        step="1"
                        value={selectedBreaker}
                        onChange={(e) => setSelectedBreaker(Number(e.target.value))}
                        className="w-full h-1.5 bg-border-theme rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {[6, 10, 16, 20, 32, 63].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setSelectedBreaker(rating)}
                            className={`py-2 rounded text-[10px] font-bold transition-all border ${
                              selectedBreaker === rating
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white border-border-theme text-text-muted hover:border-text-muted'
                            }`}
                          >
                            {rating}A
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-border-theme">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="block text-[11px] uppercase tracking-widest text-text-muted mb-2 font-bold">Tension Réseau (V)</span>
                          <input 
                            type="number"
                            value={voltage}
                            onChange={(e) => setVoltage(Number(e.target.value))}
                            className="text-2xl font-bold font-mono text-indigo-600 border-b-2 border-border-theme pb-1 w-24 outline-none focus:border-indigo-600 transition-colors bg-transparent"
                          />
                        </div>
                        <div className="text-right">
                          <span className="block text-[11px] uppercase tracking-widest text-text-muted mb-2 font-bold">mesure au borne de disjoncteur (Ω)</span>
                          <input 
                            type="number"
                            step="0.1"
                            placeholder="---"
                            value={measuredResistance}
                            onChange={(e) => setMeasuredResistance(e.target.value)}
                            className="text-2xl font-bold font-mono text-text-main border-b-2 border-border-theme pb-1 w-24 outline-none focus:border-indigo-600 transition-colors bg-transparent text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border-theme text-[12px] text-text-muted italic leading-relaxed">
                    Calcul basé sur la loi d'Ohm : R = U / I<br />
                    Pour un disjoncteur de {selectedBreaker}A sous {voltage}V, la résistance doit être supérieure à {minResistance === Infinity ? '∞' : minResistance} Ω.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="bg-[#FAFBFC] p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'consumption' ? (
              <motion.div 
                key="consumption-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col items-center"
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-text-muted mb-12">
                  Analyse de Consommation
                </div>

                <div className="relative w-64 h-64 flex items-center justify-center">
                  <div className="absolute inset-0 bg-orange-500/5 rounded-full animate-pulse" />
                  <div className="relative z-10 flex flex-col items-center">
                    <Zap className="w-16 h-16 text-orange-500 mb-4" />
                    <div className="text-4xl font-bold text-text-main">{consumptionTotals.dailyKWh.toFixed(2)}</div>
                    <div className="text-sm text-text-muted font-bold uppercase tracking-widest">kWh / Jour</div>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-8 w-full max-w-xs">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Coût Mensuel</div>
                    <div className="text-xl font-bold text-text-main">{consumptionTotals.monthlyCost.toFixed(2)} €</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Coût Annuel</div>
                    <div className="text-xl font-bold text-text-main">{consumptionTotals.yearlyCost.toFixed(2)} €</div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'threshold' ? (
              <motion.div 
                key="resistance-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full"
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-text-muted mb-6">
                  Résistance Critique (Min)
                </div>
                
                <div className="mb-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={minResistance}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[82px] font-extralight text-text-main leading-none tabular-nums"
                    >
                      {minResistance === Infinity ? '∞' : minResistance.toLocaleString('fr-FR')}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-2xl font-normal text-text-muted mb-12">Ohms (Ω)</div>

                {/* Diagnostic Overlay */}
                <AnimatePresence>
                  {diagnostic && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`mb-8 p-4 rounded-lg border ${diagnostic.bg} ${diagnostic.border} ${diagnostic.color} font-bold text-sm tracking-tight`}
                    >
                      <div className="uppercase text-[10px] tracking-widest mb-1 opacity-70">Diagnostic</div>
                      {diagnostic.status} : {diagnostic.message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full mt-8">
                  <div className="relative h-10 flex items-center">
                    <div className="w-full h-1 bg-border-theme rounded-full relative">
                      {/* Scale Markers */}
                      {[0, 16, 32, 48, 63].map((val) => {
                        const pos = (val / 63) * 100;
                        const isActive = selectedBreaker === val;
                        return (
                          <div key={val} className="absolute" style={{ left: `${pos}%` }}>
                            <div className={`w-0.5 h-6 -translate-y-1/2 absolute top-1/2 ${isActive ? 'bg-text-main h-8 -top-4 w-1' : 'bg-accent-blue opacity-30'}`} />
                            <div className={`absolute top-6 -translate-x-1/2 text-[10px] ${isActive ? 'font-bold text-text-main' : 'text-text-muted opacity-50'}`}>
                              {val}A
                            </div>
                          </div>
                        );
                      })}

                      {/* Current Breaker Marker */}
                      <motion.div
                        animate={{ left: `${(selectedBreaker / 63) * 100}%` }}
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-10 bg-accent-blue z-10 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="cable-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col items-center"
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-text-muted mb-12">
                  Visualisation Câble XVB
                </div>

                {/* Cable Cross-Section Representation */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                  {/* Outer Sheath (Grey) */}
                  <div className="absolute w-full h-full rounded-full bg-[#D1D5DB] shadow-inner border-4 border-[#9CA3AF] flex items-center justify-center">
                    {/* Inner Insulation Layer */}
                    <div className="w-[90%] h-[90%] rounded-full bg-[#F3F4F6] border border-[#E5E7EB] relative">
                      {/* Conductors (3G) */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Earth (Green/Yellow) */}
                        <div 
                          style={{ 
                            width: `${15 + (selectedSection / 16) * 40}%`, 
                            height: `${15 + (selectedSection / 16) * 40}%`,
                            top: '15%'
                          }}
                          className="absolute rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-green-500 border border-green-600 shadow-sm"
                        />
                        {/* Phase (Brown) */}
                        <div 
                          style={{ 
                            width: `${15 + (selectedSection / 16) * 40}%`, 
                            height: `${15 + (selectedSection / 16) * 40}%`,
                            bottom: '20%',
                            left: '15%'
                          }}
                          className="absolute rounded-full bg-[#78350F] border border-[#451A03] shadow-sm"
                        />
                        {/* Neutral (Blue) */}
                        <div 
                          style={{ 
                            width: `${15 + (selectedSection / 16) * 40}%`, 
                            height: `${15 + (selectedSection / 16) * 40}%`,
                            bottom: '20%',
                            right: '15%'
                          }}
                          className="absolute rounded-full bg-[#1D4ED8] border border-[#1E3A8A] shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 space-y-2">
                  <div className="text-3xl font-bold text-text-main">XVB 3G {selectedSection} mm²</div>
                  <div className="text-sm text-text-muted font-medium">
                    Diamètre approx. : {(Math.sqrt(selectedSection / Math.PI) * 2 * 1.5).toFixed(1)} mm
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeTab === 'threshold' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-8 left-12 right-12 grid grid-cols-4 gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-border-theme pt-6"
              >
                <div className="flex flex-col items-start">
                  <span className="text-text-muted mb-1">P. Limite</span>
                  <span className="text-text-main">{maxPower} W</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-text-muted mb-1">Tension (U)</span>
                  <span className="text-text-main">{voltage} V</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-text-muted mb-1">Courant (I)</span>
                  <span className={`transition-colors duration-300 ${diagnostic ? diagnostic.color : 'text-text-main'}`}>
                    {measuredCurrent > 0 ? `${measuredCurrent.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} A` : '---'}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-text-muted mb-1">R. Mesurée</span>
                  <span className="text-text-main">{measuredResistance || '---'} Ω</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] opacity-50">
        made by boularabi amine
      </div>
    </div>
  );
}
