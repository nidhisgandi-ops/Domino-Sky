import { create } from 'zustand';
import {
  Airport,
  Flight,
  Crew,
  SpareAircraft,
  Connection,
  BaselineState,
  SimulationResult,
  RecoveryEvaluation,
  RunSimulationParams,
  RecoveryActionParams,
} from '../types';
import { api } from '../services/api';

interface SimulationState {
  isLoading: boolean;
  error: string | null;
  baseline: BaselineState | null;
  currentSimulation: SimulationResult | null;
  airports: Airport[];
  flights: Flight[];
  connections: Connection[];
  crews: Crew[];
  spareAircraft: SpareAircraft[];
  selectedAirport: string | null;
  selectedFlight: string | null;
  recoveryResult: RecoveryEvaluation | null;
  isEvaluatingRecovery: boolean;
  isApplyingRecovery: boolean;
  timelinePosition: number; // minutes 0-1440 (e.g., 480 = 08:00)
  isPlaying: boolean;
  playbackSpeed: number; // 1, 2, 4, 8

  // Actions
  loadInitialData: () => Promise<void>;
  loadBaseline: () => Promise<void>;
  loadAirports: () => Promise<void>;
  runSimulation: (params: RunSimulationParams) => Promise<void>;
  resetSimulation: () => void;
  evaluateRecovery: (params: RecoveryActionParams) => Promise<RecoveryEvaluation | null>;
  applyRecovery: (params: RecoveryActionParams) => Promise<void>;
  setSelectedAirport: (id: string | null) => void;
  setSelectedFlight: (id: string | null) => void;
  setTimelinePosition: (minutes: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  clearRecoveryResult: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isLoading: false,
  error: null,
  baseline: null,
  currentSimulation: null,
  airports: [],
  flights: [],
  connections: [],
  crews: [],
  spareAircraft: [],
  selectedAirport: null,
  selectedFlight: null,
  recoveryResult: null,
  isEvaluatingRecovery: false,
  isApplyingRecovery: false,
  timelinePosition: 480, // Default to 08:00 AM (480 mins)
  isPlaying: false,
  playbackSpeed: 2,

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [baseline, airports, flights, connections, crews, spareAircraft] = await Promise.all([
        api.getBaseline().catch(() => null),
        api.getAirports().catch(() => []),
        api.getFlights().catch(() => []),
        api.getConnections().catch(() => []),
        api.getCrews().catch(() => []),
        api.getSpareAircraft().catch(() => []),
      ]);

      set({
        baseline,
        airports,
        flights,
        connections,
        crews,
        spareAircraft,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load initial dataset from server.',
        isLoading: false,
      });
    }
  },

  loadBaseline: async () => {
    try {
      const baseline = await api.getBaseline();
      set({ baseline });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load baseline.' });
    }
  },

  loadAirports: async () => {
    try {
      const airports = await api.getAirports();
      set({ airports });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load airports.' });
    }
  },

  runSimulation: async (params: RunSimulationParams) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.runSimulation(params);
      set({
        currentSimulation: result,
        recoveryResult: null,
        isLoading: false,
        selectedAirport: params.airport_id,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Simulation execution failed.',
        isLoading: false,
      });
      throw err;
    }
  },

  resetSimulation: () => {
    set({
      currentSimulation: null,
      recoveryResult: null,
      selectedAirport: null,
      selectedFlight: null,
      timelinePosition: 480,
      isPlaying: false,
    });
  },

  evaluateRecovery: async (params: RecoveryActionParams) => {
    set({ isEvaluatingRecovery: true, error: null });
    try {
      const evalResult = await api.evaluateRecovery(params);
      set({ recoveryResult: evalResult, isEvaluatingRecovery: false });
      return evalResult;
    } catch (err: any) {
      set({
        error: err.message || 'Recovery evaluation failed.',
        isEvaluatingRecovery: false,
      });
      return null;
    }
  },

  applyRecovery: async (params: RecoveryActionParams) => {
    set({ isApplyingRecovery: true, error: null });
    try {
      const updatedSim = await api.applyRecovery(params);
      set({
        currentSimulation: updatedSim,
        isApplyingRecovery: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to apply recovery strategy.',
        isApplyingRecovery: false,
      });
      throw err;
    }
  },

  setSelectedAirport: (id: string | null) => set({ selectedAirport: id }),
  setSelectedFlight: (id: string | null) => set({ selectedFlight: id }),
  setTimelinePosition: (minutes: number) =>
    set({ timelinePosition: Math.max(0, Math.min(1440, minutes)) }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
  clearRecoveryResult: () => set({ recoveryResult: null }),
}));
