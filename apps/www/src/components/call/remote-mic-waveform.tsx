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
    if (!mediaTrack || muted) {
      setEnergy(0);
      return;
    }
    if (mediaTrack.readyState !== "live") {
      setEnergy(0);
      return;
    }

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    let ctx: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let silent: GainNode | undefined;

    try {
      ctx = new Ctx();
      const stream = new MediaStream([mediaTrack]);
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -25;

      source.connect(analyser);
      silent = ctx.createGain();
      silent.gain.value = 0;
      analyser.connect(silent);
      silent.connect(ctx.destination);
    } catch {
      setEnergy(0);
      void ctx?.close().catch(() => {});
      return;
    }

    if (!ctx || !source || !analyser || !silent) {
      setEnergy(0);
      return;
    }

    void ctx.resume().catch(() => {});

    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    let raf = 0;
    let lastSet = 0;
    let smooth = 0;

    let cancelled = false;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };

    const onTrackEnded = () => {
      stop();
      setEnergy(0);
    };
    mediaTrack.addEventListener("ended", onTrackEnded);

    const tick = () => {
      if (cancelled || !ctx || ctx.state === "closed") return;
      if (mediaTrack.readyState !== "live") {
        stop();
        return;
      }
      try {
        analyser.getByteFrequencyData(data);
      } catch {
        return;
      }
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += data[i] ?? 0;
      const avg = sum / bufferLength / 255;
      const instant = Math.min(1, Math.pow(avg, 0.65) * 3.2);
      smooth = smooth * 0.45 + instant * 0.55;

      const now = performance.now();
      if (now - lastSet >= 16) {
        lastSet = now;
        setEnergy(smooth);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      stop();
      mediaTrack.removeEventListener("ended", onTrackEnded);
      try {
        source?.disconnect();
        analyser?.disconnect();
        silent?.disconnect();
      } catch {
        /* NotFoundError / InvalidStateError when graph already torn down */
      }
      void ctx?.close().catch(() => {});
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
        "inline-block shrink-0 rounded-full bg-foreground shadow-[0_0_10px_rgba(0,0,0,0.35)] dark:shadow-[0_0_10px_rgba(255,255,255,0.12)]",
        className,
      )}
      style={{
        width: "0.35rem",
        height: "0.35rem",
        transform: `scale(${scale})`,
        opacity,
        transition: "transform 20ms linear, opacity 20ms linear",
      }}
      aria-hidden
    />
  );
}
