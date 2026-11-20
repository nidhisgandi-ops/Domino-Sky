# Domino Sky: Frontend Architecture & Implementation Report

**Application**: Domino Sky - Flight Disruption Cascade & Recovery Simulator  
**Date**: 2026-11-20  
**Stack**: React 18.3 | TypeScript 5.7 | Vite 6.1 | Tailwind CSS 4.0 | Zustand 5.0 | Recharts 2.15 | Lucide Icons  
**Runtime**: Backend on `http://localhost:8000` | Frontend on `http://localhost:5173`  
**Overall Status**: **COMPLETE & VERIFIED**

---

## 1. Executive Summary

Phase 2 of **Domino Sky** delivers a premium, dark-mode aviation operations control center (AOCC). The interface mirrors a modern flight-dispatch and disruption-management workstation used by major network carriers. All calculations—including rotation propagation, ground holds, passenger connection slack, and crew duty hours—originate exclusively from the deterministic FastAPI backend.

```mermaid
graph TD
    subgraph FastAPI Backend [FastAPI Backend :8000]
        B1["/api/baseline"]
        B2["/api/simulation/run"]
        B3["/api/recovery/evaluate & /apply"]
        B4["/api/airports, /flights, /crews, /spare-aircraft"]
    end

    subgraph Vite Proxy [Vite Proxy :5173]
        P1["/api/* -> http://localhost:8000/api/*"]
    end

    subgraph Normalization Layer [api.ts (Data Normalization)]
        N1["normalizeFlightResult()"]
        N2["normalizeConnection()"]
        N3["normalizeCrew()"]
        N4["normalizeMetrics()"]
    end

    subgraph Zustand Stores [State Management]
        S1["useSimulationStore"]
        S2["useScenarioStore"]
    end

    subgraph Core UI Modules [Aviation Operations Control Center]
        M1["1. Command Centre (KPIs & Fleet Overview)"]
        M2["2. Live Network (Interactive Map)"]
        M3["3. Disruption Control (Simulator Form)"]
        M4["4. Cascade Analysis & Disruption DNA"]
        M5["5. Passenger Impact (Transfer Slacks)"]
        M6["6. Crew Operations (Duty Limits)"]
        M7["7. AI Recovery Dispatcher"]
        M8["8. Before/After Audit & Scenario Lab"]
    end

    FastAPI Backend --> Vite Proxy
    Vite Proxy --> Normalization Layer
    Normalization Layer --> Zustand Stores
    Zustand Stores --> Core UI Modules
```

---

## 2. Component Hierarchy & Module Mapping

The frontend component hierarchy directly aligns with the 8 core operational modules:

```
frontend/src/
├── App.tsx                           # Top-level routing & layout wrapper
├── main.tsx                          # React DOM entrypoint
├── index.css                         # Aviation dark control-room theme & custom scrollbars
├── types/
│   └── index.ts                      # Authoritative TypeScript domain interfaces
├── services/
│   └── api.ts                        # Typed client with response normalization
├── stores/
│   ├── simulationStore.ts            # Central operational state & active simulation
│   └── scenarioStore.ts              # Multi-scenario What-If management
├── components/
│   ├── layout/
│   │   ├── Header.tsx                # Status HUD, system clock (IST), demo quick-run
│   │   ├── Sidebar.tsx               # Collapsible navigation with dynamic status badges
│   │   └── Layout.tsx                # Root layout with persistent time scrubber
│   ├── ui/
│   │   ├── Card.tsx                  # Telemetry panel containers with status borders
│   │   ├── MetricCard.tsx            # KPI metric cards with trends and alerts
│   │   ├── Badge.tsx                 # Status chips (ON_TIME, DELAYED, CANCELLED, etc.)
│   │   ├── StatusIndicator.tsx       # Glowing telemetry dots for network health
│   │   ├── LoadingSpinner.tsx        # High-precision aviation radar spinner
│   │   └── Timeline.tsx              # Interactive 24-hour scrubber & playback loop
│   ├── network/
│   │   ├── AirportNetwork.tsx        # Interactive SVG map of 16 airports
│   │   ├── AirportNode.tsx           # Airport hub nodes with capacity & tier rings
│   │   ├── FlightRoute.tsx           # Arced flight paths color-coded by status
│   │   └── NetworkLegend.tsx         # Map symbology and status reference guide
│   ├── disruption/
│   │   ├── DisruptionDNA.tsx         # Deep-dive flight cascade breakdown modal
│   │   ├── CausalChain.tsx           # Visual causal pathway node links
│   │   └── FlightDetailPanel.tsx     # Flight telemetry inspector sidebar
│   ├── recovery/
│   │   ├── RecoveryPanel.tsx         # Tactical recovery strategy console
│   │   ├── StrategyCard.tsx          # Candidate strategy evaluation card
│   │   └── BeforeAfterComparison.tsx # Quantitative before-and-after audit grid
│   └── charts/
│       ├── AircraftRotationTimeline.tsx # Gantt-style rotation timeline chart
│       ├── DelayBarChart.tsx         # Delay distribution by airport/tail
│       ├── ConnectionStatusChart.tsx # Transfer passenger feasibility breakdown
│       ├── CrewDutyChart.tsx         # Crew duty hours vs 600m legal threshold
│       └── ScenarioComparisonChart.tsx # Multi-scenario comparative radar
└── pages/
    ├── CommandCentre.tsx             # Module 1: Operations Command Center
    ├── LiveNetwork.tsx               # Module 2: Interactive Airport Network
    ├── DisruptionControl.tsx         # Module 3: Disruption Simulator
    ├── CascadeAnalysis.tsx           # Module 4: Domino Effect Visualization
    ├── PassengerImpact.tsx           # Module 5: Passenger Transfer Intelligence
    ├── CrewOperations.tsx            # Module 6: Crew Monitoring & DGCA Limits
    ├── AIDispatcher.tsx              # Module 7: AI Recovery Dispatcher
    └── ScenarioLab.tsx               # Module 8: Multi-Scenario Lab
```

---

## 3. Core Modules Implementation Detail

### Module 1: Operations Command Center ([`CommandCentre.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/CommandCentre.tsx))
- **Live Fleet Telemetry**: Displays total flights (70), active aircraft (16), available spares (2), and operational hubs (16).
- **KPI Grid**: Delayed count, total delay minutes, cancellations, stranded passengers, and crew violations.
- **Top 5 Critical Delay Cascade Table**: Lists flights with highest downstream delays and allows one-click navigation to their Disruption DNA.
- **Visual Status**: Color-coded cards (cyan for normal, amber for delays, crimson for cancellations/violations).

### Module 2: Interactive Airport Network ([`LiveNetwork.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/LiveNetwork.tsx) & [`AirportNetwork.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/components/network/AirportNetwork.tsx))
- **Geographic Projection**: Precise linear projection mapping all 16 Indian airports based on real coordinates.
- **Dynamic Route Arcs**: Flight routes rendered with visually distinct styling:
  - Cyan solid line: On-time flight
  - Amber glowing line: Delayed flight
  - Red dashed line: Cancelled flight
- **Interactive Airport Inspector**: Clicking any airport displays its tier, capacity/hour, departing flights, arriving flights, and current disruption status.

### Module 3: Disruption Simulator ([`DisruptionControl.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/DisruptionControl.tsx))
- **Closure Configuration**: Airport dropdown (DEL, BOM, BLR, etc.), 24-hour time picker (`HH:MM`), and duration slider (15 to 480 minutes).
- **Quick Demo Trigger**: Single click pre-fills the canonical demo scenario: Mumbai (BOM) runway closure from 08:00 for 90 minutes.
- **Reopen Time Calculation**: Automatically computes airport reopen time.
- **Validation**: Strict validation prevents invalid times or zero-minute durations.

### Module 4: Domino Effect Visualization ([`CascadeAnalysis.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/CascadeAnalysis.tsx) & [`DisruptionDNA.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/components/disruption/DisruptionDNA.tsx))
- **Rotation Timeline**: Gantt chart showing aircraft rotations (`VT-DS01` to `VT-DS16`) across the 24-hour day.
- **Flight Causal Chain**: Displays the causal sequence for every delayed leg:
  $$\text{AIRPORT\_CLOSURE} \longrightarrow \text{PREVIOUS\_FLIGHT\_DELAY} \longrightarrow \text{AIRCRAFT\_TURNAROUND}$$
- **Disruption DNA Modal**: Deep-dive inspector showing telemetry, turnaround absorption buffer (30m min), affected downstream legs, linked passenger transfers, and crew status.

### Module 5: Passenger Impact ([`PassengerImpact.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/PassengerImpact.tsx))
- **Transfer Slack Tracker**: Compares actual transfer slack ($D_{\text{to}} - A_{\text{from}}$) against `min_connect_minutes`.
- **Status Classification**: `FEASIBLE` (slack $\ge$ min + 20m), `AT_RISK` (min $\le$ slack < min + 20m), `MISSED` (slack < min).
- **Stranded Passenger Counts**: Sums passengers across missed connection pairs without double-counting.

### Module 6: Crew Monitoring ([`CrewOperations.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/CrewOperations.tsx))
- **Regulatory Duty Meter**: Monitors actual duty ($A_{\text{last flight}} - \text{duty\_start}$) against the DGCA 600-minute (10-hour) ceiling.
- **Alert Levels**:
  - `OK`: Remaining duty $> 60$ minutes.
  - `WARNING`: Remaining duty $\le 60$ minutes (critical buffer).
  - `VIOLATION`: Duty exceeded 600 minutes (red warning badge with overtime minutes).

### Module 7: AI Recovery Dispatcher ([`AIDispatcher.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/AIDispatcher.tsx) & [`RecoveryPanel.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/components/recovery/RecoveryPanel.tsx))
- **Standby Aircraft Substitutions**: Automatically pairs delayed flights departing from BLR with `VT-DS17` and flights departing from DEL with `VT-DS18`.
- **Flight Cancellations**: Generates selective cancellation proposals for critical bottleneck flights.
- **Evaluate & Apply**: Allows dispatchers to evaluate the impact of an action before committing it to the scenario.
- **Mandatory Policy Callout**:
  > *"Crew availability and aircraft-specific operational compatibility are not independently verified"*

### Module 8: Before-and-After Comparison ([`BeforeAfterComparison.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/components/recovery/BeforeAfterComparison.tsx) & [`ScenarioLab.tsx`](file:///c:/Users/NIDHIS%20GANDHI%20D/OneDrive/Desktop/Domino-Sky/frontend/src/pages/ScenarioLab.tsx))
- **Quantitative Delta Grid**: Directly compares baseline vs disrupted, or disrupted vs recovered.
- **Metrics Displayed**: $\Delta$ Delayed Flights, $\Delta$ Total Delay Minutes, $\Delta$ Cancellations, $\Delta$ Missed Connections, $\Delta$ Crew Violations.
- **Multi-Scenario Sandbox**: Create, duplicate, and benchmark multiple scenarios side-by-side with radar charts.

---

## 4. Design Vision & Styling

- **Theme**: Deep space aviation control center (`#080D18` background, `#101827` panels, `#1F2E47` borders).
- **Accents**:
  - `#35B6F6` (Electric Cyan) — Primary telemetry and active routes
  - `#36D6B0` (Mint Green) — On-time flights and compliant crews
  - `#F5B942` (Amber) — Delays, turnaround warnings, and at-risk connections
  - `#F05B67` (Crimson) — Ground stops, cancellations, and regulatory duty violations
- **Typography**: Clean monospace font for time, flight numbers, aircraft tails, and telemetry figures.
- **Grid Texture**: Subtle radar/aviation grid overlay (`bg-aviation-grid`).

---

## 5. Build & Integration Verification

### Production Build
```
vite v6.4.6 building for production...
transforming...
✓ 2051 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.14 kB │ gzip:   0.68 kB
dist/assets/index-DUZ0AJ4r.css   36.82 kB │ gzip:   7.10 kB
dist/assets/index-Z_PEvj7a.js   741.77 kB │ gzip: 206.02 kB
✓ built in 4.77s
```

### Live Servers
- **Backend**: FastAPI live on `http://localhost:8000` (Process active)
- **Frontend**: Vite Dev Server live on `http://localhost:5173` (Process active)
- **Proxy**: Requests to `http://localhost:5173/api/*` reverse-proxied to `http://localhost:8000/api/*` with 200 OK responses.
