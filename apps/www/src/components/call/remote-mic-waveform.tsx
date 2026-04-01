"use client";

import { useRemoteParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useRemoteMicWaveformLevels(barCount: number): number[] {
  const participants = useRemoteParticipants();
  const [levels, setLevels] = useState(() =>
    Array.from({ length: barCount }, () => 0.12),
  );

  const first = participants[0];
  const micPub = first?.getTrackPublication(Track.Source.Microphone);
  const muted = micPub?.isMuted ?? false;
  const mediaTrack = micPub?.track?.mediaStreamTrack;

  useEffect(() => {
    if (!mediaTrack || mediaTrack.readyState === "ended" || muted) {
      setLevels(Array.from({ length: barCount }, () => 0.12));
      return;
    }

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const stream = new MediaStream([mediaTrack]);
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.72;
    analyser.minDecibels = -85;
    analyser.maxDecibels = -25;

    source.connect(analyser);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    analyser.connect(silent);
    silent.connect(ctx.destination);

    void ctx.resume();

    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    let raf = 0;
    let lastSet = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const binsPerBar = Math.max(1, Math.ceil(bufferLength / barCount));
      const next: number[] = [];
      for (let b = 0; b < barCount; b++) {
        let sum = 0;
        const start = b * binsPerBar;
        const end = Math.min(start + binsPerBar, bufferLength);
        for (let i = start; i < end; i++) sum += data[i] ?? 0;
        const avg = sum / Math.max(1, end - start) / 255;
        next.push(Math.min(1, Math.pow(avg, 0.65) * 3.2));
      }
      const now = performance.now();
      if (now - lastSet >= 45) {
        lastSet = now;
        setLevels(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      analyser.disconnect();
      silent.disconnect();
      ctx.close();
    };
  }, [mediaTrack?.id, muted, mediaTrack?.readyState, barCount]);

  return levels;
}

export function RemoteMicWaveform({
  barCount,
  className,
  barClassName,
  gapPx = 3,
}: {
  barCount: number;
  className?: string;
  barClassName?: string;
  /** Tighter bars for minimized pill */
  gapPx?: number;
}) {
  const levels = useRemoteMicWaveformLevels(barCount);
  const gapStyle = { gap: gapPx };

  return (
    <div className={cn("flex items-end", className)} style={gapStyle}>
      {levels.map((level, i) => (
        <div
          key={i}
          className={cn("w-[3px] rounded-full bg-green-400", barClassName)}
          style={{
            height: `${Math.max(20, level * 100)}%`,
            minHeight: 3,
            transition: "height 45ms ease-out",
          }}
        />
      ))}
    </div>
  );
}
