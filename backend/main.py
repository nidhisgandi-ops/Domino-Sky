"""Main FastAPI application for Domino Sky flight disruption simulator.

Provides RESTful endpoints for baseline schedule analysis, airport closure cascades,
downstream passenger and crew disruption calculations, and tactical recovery operations.
"""

from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.airports import router as airports_router
from api.flights import router as flights_router
from api.recovery import router as recovery_router
from api.scenarios import router as scenarios_router
from api.simulation import router as simulation_router
from data_loader import get_data_loader
from simulation.scenario_engine import get_scenario_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle handler."""
    # Startup: Load and validate flight network JSON dataset
    loader = get_data_loader()
    get_scenario_manager(loader)
    print(
        f"[Domino Sky] Dataset loaded: {len(loader.airports)} airports, "
        f"{len(loader.flights)} flights, {len(loader.aircraft)} aircraft, "
        f"{len(loader.connections)} connections, {len(loader.crews)} crews, "
        f"{len(loader.spare_aircraft)} spare aircraft."
    )
    yield


app = FastAPI(
    title="Domino Sky Disruption Simulator API",
    description="High-fidelity aviation disruption and recovery cascade simulator backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["system"])
def health_check():
    """Health status and dataset integrity verification."""
    loader = get_data_loader()
    return {
        "status": "healthy",
        "dataset": loader.meta.dataset,
        "operating_day": loader.meta.operating_day,
        "airports_count": len(loader.airports),
        "flights_count": len(loader.flights),
        "aircraft_count": len(loader.aircraft),
        "connections_count": len(loader.connections),
        "crews_count": len(loader.crews),
        "spare_aircraft_count": len(loader.spare_aircraft),
    }


# Include functional routers
app.include_router(airports_router)
app.include_router(flights_router)
app.include_router(simulation_router)
app.include_router(recovery_router)
app.include_router(scenarios_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
