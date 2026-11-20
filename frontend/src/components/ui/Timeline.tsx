import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Play, Pause, RotateCcw, FastForward, Clock, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '../../stores/simulationStore';

export const Timeline: React.FC = () => {
  const {
    timelinePosition,
    setTimelinePosition,
    isPlaying,
    togglePlayback,
    playbackSpeed,
    setPlaybackSpeed,
    currentSimulation,
    baseline,
  } = useSimulationStore();

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Convert minutes to HH:MM string
  const formatTime = (mins: number) => {
    const hours = Math.floor(mins / 60) % 24;
    const minutes = mins % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Convert HH:MM string to minutes
  const parseTimeToMins = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = null;
      return;
    }

    const step = (time: number) => {
      if (lastTimeRef.current != null) {
        const delta = time - lastTimeRef.current;
        // Advance 1 min every (1000 / (10 * playbackSpeed)) ms
        const minutesToAdd = (delta / 1000) * 10 * playbackSpeed;
        if (minutesToAdd >= 1) {
          setTimelinePosition(
            timelinePosition >= 1440 ? 0 : Math.round(timelinePosition + minutesToAdd)
          );
          lastTimeRef.current = time;
        }
      } else {
        lastTimeRef.current = time;
      }
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playbackSpeed, timelinePosition, setTimelinePosition]);

  // Compute closure window markers
  const closureStartMins = currentSimulation?.closure_start
    ? parseTimeToMins(currentSimulation.closure_start)
    : null;
  const closureDuration = currentSimulation?.closure_duration_minutes || 0;
  const closureEndMins = closureStartMins !== null ? closureStartMins + closureDuration : null;

  // Active flights at current timeline moment
  const allFlights = currentSimulation?.all_flights || baseline?.flights || [];
  const inAirCount = allFlights.filter((f) => {
    const depM = parseTimeToMins(f.actual_dep || f.scheduled_dep);
    const arrM = parseTimeToMins(f.actual_arr || f.scheduled_arr);
    return depM !== null && arrM !== null && timelinePosition >= depM && timelinePosition <= arrM;
  }).length;

  const completedCount = allFlights.filter((f) => {
    const arrM = parseTimeToMins(f.actual_arr || f.scheduled_arr);
    return arrM !== null && timelinePosition > arrM;
  }).length;

  const speeds = [1, 2, 4, 8];

  return (
    <div className="bg-[#151F30] border border-[#1F2E47] rounded-lg p-3 shadow-lg">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
        {/* Current Time Display */}
        <div className="flex items-center gap-3">
          <div className="bg-[#101827] border border-[#1F2E47] px-3 py-1.5 rounded flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#35B6F6]" />
            <span className="font-mono text-lg font-bold text-[#E8EEF8]">
              {formatTime(timelinePosition)}
            </span>
            <span className="text-[10px] text-[#91A0B8] font-mono">IST</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-[#91A0B8]">
            <span>
              In-Air:{' '}
              <strong className="text-[#36D6B0] font-mono">{inAirCount}</strong>
            </span>
            <span>•</span>
            <span>
              Completed:{' '}
              <strong className="text-[#35B6F6] font-mono">{completedCount}</strong>
            </span>
            {currentSimulation && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#F05B67]">
                  <AlertTriangle className="w-3 h-3" />
                  Delayed:{' '}
                  <strong className="font-mono">{currentSimulation.metrics.delayed_flights}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimelinePosition(480)}
            title="Reset to 08:00"
            className="p-1.5 bg-[#101827] hover:bg-[#1B293F] text-[#91A0B8] hover:text-[#E8EEF8] border border-[#1F2E47] rounded transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlayback}
            className={clsx(
              'px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition',
              isPlaying
                ? 'bg-[#F5B942] text-[#080D18] hover:bg-[#F5B942]/90'
                : 'bg-[#35B6F6] text-[#080D18] hover:bg-[#35B6F6]/90'
            )}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Play
              </>
            )}
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center bg-[#101827] border border-[#1F2E47] rounded p-0.5">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={clsx(
                  'px-2 py-0.5 text-[11px] font-mono font-medium rounded transition',
                  playbackSpeed === s
                    ? 'bg-[#35B6F6] text-[#080D18]'
                    : 'text-[#91A0B8] hover:text-[#E8EEF8]'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubber / Slider Track */}
      <div className="relative pt-3 pb-1">
        {/* Track Background with closure zone highlight */}
        <div className="relative h-2 bg-[#101827] border border-[#1F2E47] rounded-full overflow-hidden">
          {closureStartMins !== null && closureEndMins !== null && (
            <div
              className="absolute top-0 bottom-0 bg-[#F05B67]/40 border-x border-[#F05B67]"
              style={{
                left: `${(closureStartMins / 1440) * 100}%`,
                width: `${((closureEndMins - closureStartMins) / 1440) * 100}%`,
              }}
              title={`Closure window: ${currentSimulation?.closure_start} - ${formatTime(closureEndMins)}`}
            />
          )}
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-[#35B6F6]/30 to-[#35B6F6]"
            style={{ width: `${(timelinePosition / 1440) * 100}%` }}
          />
        </div>

        {/* Real Interactive Range Input */}
        <input
          type="range"
          min={0}
          max={1440}
          step={5}
          value={timelinePosition}
          onChange={(e) => setTimelinePosition(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Time ticks */}
        <div className="flex justify-between text-[10px] font-mono text-[#91A0B8] mt-1.5 select-none pointer-events-none">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );
};
