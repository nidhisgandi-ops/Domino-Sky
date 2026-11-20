import { create } from 'zustand';
import { Scenario, RunSimulationParams } from '../types';
import { api } from '../services/api';

interface ScenarioState {
  scenarios: Scenario[];
  isLoading: boolean;
  error: string | null;
  selectedScenarioIds: string[];

  // Actions
  loadScenarios: () => Promise<void>;
  createScenario: (params: RunSimulationParams) => Promise<Scenario>;
  deleteScenario: (id: string) => Promise<void>;
  toggleSelectScenario: (id: string) => void;
  clearSelectedScenarios: () => void;
  duplicateScenario: (id: string) => Promise<void>;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: [],
  isLoading: false,
  error: null,
  selectedScenarioIds: [],

  loadScenarios: async () => {
    set({ isLoading: true, error: null });
    try {
      const scenarios = await api.getScenarios();
      set({ scenarios, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to fetch scenarios',
        isLoading: false,
      });
    }
  },

  createScenario: async (params: RunSimulationParams) => {
    set({ isLoading: true, error: null });
    try {
      const newScenario = await api.createScenario(params);
      set((state) => ({
        scenarios: [newScenario, ...state.scenarios],
        isLoading: false,
      }));
      return newScenario;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to create scenario',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteScenario: async (id: string) => {
    try {
      await api.deleteScenario(id);
      set((state) => ({
        scenarios: state.scenarios.filter((s) => s.scenario_id !== id),
        selectedScenarioIds: state.selectedScenarioIds.filter((sid) => sid !== id),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete scenario' });
      throw err;
    }
  },

  toggleSelectScenario: (id: string) => {
    set((state) => {
      const exists = state.selectedScenarioIds.includes(id);
      return {
        selectedScenarioIds: exists
          ? state.selectedScenarioIds.filter((sid) => sid !== id)
          : [...state.selectedScenarioIds, id],
      };
    });
  },

  clearSelectedScenarios: () => {
    set({ selectedScenarioIds: [] });
  },

  duplicateScenario: async (id: string) => {
    const target = get().scenarios.find((s) => s.scenario_id === id);
    if (!target) return;
    const duplicatedParams: RunSimulationParams = {
      airport_id: target.airport_id,
      closure_start: target.closure_start,
      closure_duration_minutes: target.closure_duration_minutes,
      scenario_name: `${target.scenario_name || 'Scenario'} (Copy)`,
    };
    await get().createScenario(duplicatedParams);
  },
}));
