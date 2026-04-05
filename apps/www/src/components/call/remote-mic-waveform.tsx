"use client";

import { useRemoteParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useRemoteMicEnergy(): number {
  const participants = useRemoteParticipants();
  const [energy, setEnergy] = useState(0);

  const first = participants[0];
  const micPub = first?.getTrackPublication(Track.Source.Microphone);
  const muted = micPub?.isMuted ?? false;
  const mediaTrack = micPub?.track?.mediaStreamTrack;

  useEffect(() => {
    if (!mediaTrack || mediaTrack.readyState === "ended" || muted) {
      setEnergy(0);
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
    let smooth = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += data[i] ?? 0;
      const avg = sum / bufferLength / 255;
      const instant = Math.min(1, Math.pow(avg, 0.65) * 3.2);
      smooth = smooth * 0.72 + instant * 0.28;

      const now = performance.now();
      if (now - lastSet >= 45) {
        lastSet = now;
        setEnergy(smooth);
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
  }, [mediaTrack?.id, muted, mediaTrack?.readyState]);

  return energy;
}

/** Single green dot whose scale/opacity follows the remote mic (no bar graph). */
export function RemoteMicWaveform({ className }: { className?: string }) {
  const energy = useRemoteMicEnergy();
  const scale = 0.65 + energy * 0.9;
  const opacity = 0.3 + energy * 0.7;

  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]",
        className,
      )}
      style={{
        width: "0.35rem",
        height: "0.35rem",
        transform: `scale(${scale})`,
        opacity,
        transition: "transform 55ms ease-out, opacity 55ms ease-out",
      }}
      aria-hidden
    />
  );
}
