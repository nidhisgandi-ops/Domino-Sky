import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CommandCentre } from './pages/CommandCentre';
import { LiveNetwork } from './pages/LiveNetwork';
import { DisruptionControl } from './pages/DisruptionControl';
import { CascadeAnalysis } from './pages/CascadeAnalysis';
import { PassengerImpact } from './pages/PassengerImpact';
import { CrewOperations } from './pages/CrewOperations';
import { AIDispatcher } from './pages/AIDispatcher';
import { ScenarioLab } from './pages/ScenarioLab';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CommandCentre />} />
          <Route path="network" element={<LiveNetwork />} />
          <Route path="disruption-control" element={<DisruptionControl />} />
          <Route path="cascade" element={<CascadeAnalysis />} />
          <Route path="passengers" element={<PassengerImpact />} />
          <Route path="crew" element={<CrewOperations />} />
          <Route path="dispatcher" element={<AIDispatcher />} />
          <Route path="scenarios" element={<ScenarioLab />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
