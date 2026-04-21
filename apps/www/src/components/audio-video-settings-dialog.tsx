"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Mic, Volume2, Video, Sparkles, RotateCcw, Play } from "lucide-react";
import { Button } from "./ui/button";
import {
  useAudioSettings,
  type AudioQuality,
  type AudioSettings,
} from "@/hooks/useAudioSettings";

type Device = { deviceId: string; label: string };

function deviceLabel(d: MediaDeviceInfo, fallbackPrefix: string, index: number) {
  return d.label?.trim() || `${fallbackPrefix} ${index + 1}`;
}

async function requestMediaPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

async function enumerateDevices() {
  const all = await navigator.mediaDevices.enumerateDevices();
  const mics: Device[] = [];
  const speakers: Device[] = [];
  const cameras: Device[] = [];
  let micIdx = 0;
  let spkIdx = 0;
  let camIdx = 0;
  for (const d of all) {
    if (d.kind === "audioinput")
      mics.push({ deviceId: d.deviceId, label: deviceLabel(d, "Microphone", micIdx++) });
    else if (d.kind === "audiooutput")
      speakers.push({ deviceId: d.deviceId, label: deviceLabel(d, "Speaker", spkIdx++) });
    else if (d.kind === "videoinput")
      cameras.push({ deviceId: d.deviceId, label: deviceLabel(d, "Camera", camIdx++) });
  }
  return { mics, speakers, cameras };
}

/** Section wrapper that matches the New Loom dialog aesthetic. */
function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-black/40 dark:text-white/40" />
        <label className="block text-[11px] font-medium text-black/45 dark:text-white/45 uppercase tracking-wider">
          {label}
        </label>
      </div>
      {children}
    </div>
  );
}

function StyledSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Device[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-black/[0.04] dark:bg-white/[0.06] rounded-xl px-3.5 py-2.5 pr-9 text-sm outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 text-black dark:text-white transition-colors cursor-pointer"
      >
        {options.length === 0 ? (
          <option value="default">{placeholder}</option>
        ) : (
          <>
            <option value="default">System default</option>
            {options
              .filter((o) => o.deviceId && o.deviceId !== "default")
              .map((o) => (
                <option key={o.deviceId} value={o.deviceId}>
                  {o.label}
                </option>
              ))}
          </>
        )}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function QualityToggle({
  value,
  onChange,
}: {
  value: AudioQuality;
  onChange: (next: AudioQuality) => void;
}) {
  const options: { value: AudioQuality; label: string; desc: string }[] = [
    { value: "normal", label: "Normal", desc: "Speech tuned, low bandwidth" },
    { value: "high", label: "High", desc: "Stereo music-grade Opus" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3.5 py-3 rounded-xl text-left transition-all border ${
              selected
                ? "bg-black/[0.06] dark:bg-white/[0.08] border-black/10 dark:border-white/10 shadow-sm"
                : "bg-transparent border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-sm font-medium ${
                  selected ? "text-black dark:text-white" : "text-black/70 dark:text-white/70"
                }`}
              >
                {opt.label}
              </p>
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                  selected
                    ? "border-black dark:border-white"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                {selected && <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />}
              </div>
            </div>
            <p className="text-[11px] text-black/40 dark:text-white/40 leading-tight mt-0.5">
              {opt.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-full flex items-start justify-between gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black/80 dark:text-white/85">{label}</p>
        <p className="text-[11px] text-black/40 dark:text-white/40 leading-tight mt-0.5">
          {description}
        </p>
      </div>
      <div
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-black dark:bg-white" : "bg-black/15 dark:bg-white/15"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-black shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

/** Live mic level meter. Creates a dedicated MediaStream on `deviceId`. */
function MicLevelMeter({ deviceId, enabled }: { deviceId: string; enabled: boolean }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
          },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        ctxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);

        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sumSquares = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i]! - 128) / 128;
            sumSquares += v * v;
          }
          const rms = Math.sqrt(sumSquares / buf.length);
          // Compress dynamic range so normal speech hits ~60–80% of the bar.
          const visual = Math.min(1, rms * 3);
          setLevel(visual);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLevel(0);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [deviceId, enabled]);

  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
        style={{ width: `${Math.round(level * 100)}%` }}
      />
    </div>
  );
}

/** Small live camera preview keyed to `deviceId`. */
function CameraPreview({ deviceId, enabled }: { deviceId: string; enabled: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setError(null);
      } catch {
        setError("Camera unavailable");
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [deviceId, enabled]);

  return (
    <div className="mt-2 relative aspect-video w-full rounded-xl overflow-hidden bg-black/[0.06] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-black/40 dark:text-white/40">
          {error}
        </div>
      )}
    </div>
  );
}

async function playSpeakerTest(sinkId: string) {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  // Synthesize a quick two-note chime so the user hears something short.
  const duration = 0.55;
  const sampleCount = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    const t = i / ctx.sampleRate;
    const env = Math.min(1, t * 12) * Math.exp(-3 * t);
    const freq = t < duration / 2 ? 660 : 880;
    data[i] = 0.35 * env * Math.sin(2 * Math.PI * freq * t);
  }

  const dest = ctx.createMediaStreamDestination();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(dest);
  src.connect(ctx.destination); // fallback if setSinkId unsupported

  const audioEl = new Audio();
  audioEl.srcObject = dest.stream;
  audioEl.autoplay = true;

  type AudioElWithSinkId = HTMLAudioElement & {
    setSinkId?: (id: string) => Promise<void>;
  };
  const el = audioEl as AudioElWithSinkId;
  if (sinkId && sinkId !== "default" && typeof el.setSinkId === "function") {
    try {
      await el.setSinkId(sinkId);
    } catch {
      // Browser didn't allow it; fallback audio still plays through ctx.destination.
    }
  }

  src.start();
  src.onended = () => {
    audioEl.srcObject = null;
    ctx.close().catch(() => {});
  };
}

interface AudioVideoSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AudioVideoSettingsDialog({
  open,
  onOpenChange,
}: AudioVideoSettingsDialogProps) {
  const { settings, updateSettings, resetSettings } = useAudioSettings();
  const [mics, setMics] = useState<Device[]>([]);
  const [speakers, setSpeakers] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [speakerTesting, setSpeakerTesting] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const { mics, speakers, cameras } = await enumerateDevices();
      setMics(mics);
      setSpeakers(speakers);
      setCameras(cameras);
      setPermissionGranted(mics.some((m) => m.label) || cameras.some((c) => c.label));
    } catch {
      setPermissionGranted(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    void loadDevices();

    const onDeviceChange = () => {
      void loadDevices();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [open, loadDevices]);

  const handleGrantPermission = useCallback(async () => {
    const ok = await requestMediaPermissions();
    setPermissionGranted(ok);
    if (ok) await loadDevices();
  }, [loadDevices]);

  const handleTestSpeaker = useCallback(async () => {
    if (speakerTesting) return;
    setSpeakerTesting(true);
    try {
      await playSpeakerTest(settings.speakerDeviceId);
    } finally {
      window.setTimeout(() => setSpeakerTesting(false), 650);
    }
  }, [settings.speakerDeviceId, speakerTesting]);

  const set = <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) =>
    updateSettings({ [key]: value } as Partial<AudioSettings>);

  if (!open) return null;

  const labelsUnavailable = permissionGranted === false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-[460px] max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <h2 className="text-base font-semibold text-black dark:text-white flex-1">
            Audio &amp; Video Settings
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {labelsUnavailable && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <div className="text-[12px] leading-snug">
                Grant microphone and camera access to pick specific devices.
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGrantPermission}
                className="h-7 rounded-lg text-[11px] font-medium shrink-0"
              >
                Grant access
              </Button>
            </div>
          )}

          {/* Microphone */}
          <Section label="Microphone" icon={Mic}>
            <StyledSelect
              value={settings.micDeviceId}
              onChange={(v) => set("micDeviceId", v)}
              options={mics}
              placeholder="System default"
            />
            <MicLevelMeter deviceId={settings.micDeviceId} enabled={open} />
          </Section>

          {/* Speaker */}
          <Section label="Speaker" icon={Volume2}>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <StyledSelect
                  value={settings.speakerDeviceId}
                  onChange={(v) => set("speakerDeviceId", v)}
                  options={speakers}
                  placeholder="System default"
                />
              </div>
              <button
                onClick={handleTestSpeaker}
                disabled={speakerTesting}
                className="h-[42px] px-3 rounded-xl text-sm font-medium text-black/70 dark:text-white/80 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play size={13} />
                Test
              </button>
            </div>
          </Section>

          {/* Camera */}
          <Section label="Camera" icon={Video}>
            <StyledSelect
              value={settings.cameraDeviceId}
              onChange={(v) => set("cameraDeviceId", v)}
              options={cameras}
              placeholder="System default"
            />
            <CameraPreview deviceId={settings.cameraDeviceId} enabled={open} />
          </Section>

          {/* Audio Quality */}
          <Section label="Audio Quality" icon={Sparkles}>
            <QualityToggle
              value={settings.quality}
              onChange={(v) => set("quality", v)}
            />
            {settings.quality === "high" && (
              <p className="text-[11px] text-black/40 dark:text-white/40 mt-2 leading-snug">
                High quality uses much more bandwidth. Headphones recommended — with
                speakers, turn on Echo Cancellation below to prevent feedback.
              </p>
            )}
            <p className="text-[11px] text-black/35 dark:text-white/35 mt-1.5 leading-snug">
              Quality changes apply to your next call.
            </p>
          </Section>

          {/* Audio Processing */}
          <Section label="Audio Processing" icon={Mic}>
            <div className="space-y-0.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-1">
              <ToggleRow
                label="Echo cancellation"
                description="Removes your own audio from the mic. Keep on unless using headphones."
                checked={settings.echoCancellation}
                onChange={(v) => set("echoCancellation", v)}
              />
              <ToggleRow
                label="Noise suppression"
                description="Filters steady background noise like fans and keyboards."
                checked={settings.noiseSuppression}
                onChange={(v) => set("noiseSuppression", v)}
              />
              <ToggleRow
                label="Automatic gain control"
                description="Normalizes your volume. Disable if your mic already sounds good."
                checked={settings.autoGainControl}
                onChange={(v) => set("autoGainControl", v)}
              />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-black/10 dark:border-white/10">
          <button
            onClick={resetSettings}
            className="h-10 px-3 rounded-xl text-sm font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <Button
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-xl font-medium"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
