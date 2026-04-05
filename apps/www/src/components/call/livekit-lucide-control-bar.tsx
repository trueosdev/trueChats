"use client"

import { useCallback } from "react"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  ChevronUp,
} from "lucide-react"
import {
  MediaDeviceMenu,
  useTrackToggle,
  usePersistentUserChoices,
  useLocalParticipantPermissions,
} from "@livekit/components-react"
import { supportsScreenSharing } from "@livekit/components-core"
import { Track } from "livekit-client"
import { cn } from "@/lib/utils"

const trackSourceToProtocol = (source: Track.Source) => {
  switch (source) {
    case Track.Source.Camera:
      return 1
    case Track.Source.Microphone:
      return 2
    case Track.Source.ScreenShare:
      return 3
    default:
      return 0
  }
}

function LucideMicToggle({
  onChange,
  onDeviceError,
}: {
  onChange?: (enabled: boolean, isUserInitiated: boolean) => void
  onDeviceError?: (error: Error) => void
}) {
  const { buttonProps, enabled } = useTrackToggle({
    source: Track.Source.Microphone,
    onChange,
    onDeviceError,
  })
  const { className, ...rest } = buttonProps
  return (
    <button type="button" {...rest} className={cn(className)}>
      {enabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
    </button>
  )
}

function LucideCameraToggle({
  onChange,
  onDeviceError,
}: {
  onChange?: (enabled: boolean, isUserInitiated: boolean) => void
  onDeviceError?: (error: Error) => void
}) {
  const { buttonProps, enabled } = useTrackToggle({
    source: Track.Source.Camera,
    onChange,
    onDeviceError,
  })
  const { className, ...rest } = buttonProps
  return (
    <button type="button" {...rest} className={cn(className)}>
      {enabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
    </button>
  )
}

function LucideScreenShareToggle({
  onChange,
  onDeviceError,
}: {
  onChange?: (enabled: boolean, isUserInitiated: boolean) => void
  onDeviceError?: (error: Error) => void
}) {
  const { buttonProps, enabled } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: { audio: true, selfBrowserSurface: "include" },
    onChange,
    onDeviceError,
  })
  const { className, ...rest } = buttonProps
  return (
    <button type="button" {...rest} className={cn(className)}>
      {enabled ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
    </button>
  )
}

export interface LiveKitLucideControlBarProps {
  /** Wrap with e.g. `dm-call-controls` for dark full-screen call styling */
  className?: string
  microphone?: boolean
  camera?: boolean
  screenShare?: boolean
}

export function LiveKitLucideControlBar({
  className,
  microphone = true,
  camera = true,
  screenShare = true,
}: LiveKitLucideControlBarProps) {
  const permissions = useLocalParticipantPermissions()
  const { saveAudioInputEnabled, saveVideoInputEnabled } =
    usePersistentUserChoices({})

  const microphoneOnChange = useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveAudioInputEnabled(enabled) : null,
    [saveAudioInputEnabled],
  )

  const cameraOnChange = useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveVideoInputEnabled(enabled) : null,
    [saveVideoInputEnabled],
  )

  const canPublishSource = useCallback(
    (source: Track.Source) => {
      if (!permissions) return false
      if (!permissions.canPublish) return false
      if (permissions.canPublishSources.length === 0) return true
      return permissions.canPublishSources.includes(trackSourceToProtocol(source))
    },
    [permissions],
  )

  const showMic = microphone && canPublishSource(Track.Source.Microphone)
  const showCam = camera && canPublishSource(Track.Source.Camera)
  const showShare =
    screenShare && supportsScreenSharing() && canPublishSource(Track.Source.ScreenShare)

  if (!permissions) {
    return <div className={cn("lk-control-bar", className)} />
  }

  return (
    <div className={cn("lk-control-bar", className)}>
      {showMic && (
        <div className="lk-button-group">
          <LucideMicToggle
            onChange={microphoneOnChange}
            onDeviceError={(error) => console.error("Mic device error", error)}
          />
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="audioinput">
              <ChevronUp className="h-4 w-4" />
            </MediaDeviceMenu>
          </div>
        </div>
      )}
      {showCam && (
        <div className="lk-button-group">
          <LucideCameraToggle
            onChange={cameraOnChange}
            onDeviceError={(error) => console.error("Camera device error", error)}
          />
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="videoinput">
              <ChevronUp className="h-4 w-4" />
            </MediaDeviceMenu>
          </div>
        </div>
      )}
      {showShare && (
        <LucideScreenShareToggle
          onDeviceError={(error) => console.error("Screen share error", error)}
        />
      )}
    </div>
  )
}
