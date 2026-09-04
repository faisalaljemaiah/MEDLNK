"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Area } from "react-easy-crop";
import { cropImageToFile } from "@/lib/crop-image";

// Dynamic + ssr:false for two reasons: it measures the DOM (can't run on
// the server) and it's only ever needed the moment someone picks a photo —
// no reason for its code to load with every page that renders the avatar
// picker.
const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false });

/**
 * Shown the moment a photo is picked, before it ever reaches the upload —
 * free pan, zoom and rotation (not locked to 90° turns), round preview
 * since every avatar renders as a circle. "Save" bakes the crop into a new
 * File via canvas (src/lib/crop-image.ts) and hands it back; the caller
 * swaps it into the file input the same way HEIC conversion already does.
 */
export function AvatarCropper({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await cropImageToFile(imageSrc, croppedAreaPixels, rotation, "avatar.jpg");
      onCropped(file);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop photo"
      className="animate-enter fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--shadow-tint)/0.6)] p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-4 shadow-[0_16px_48px_-12px_rgb(var(--shadow-tint)/0.35)]">
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={1}
            maxZoom={3}
            zoomSpeed={1}
            restrictPosition={true}
            style={{}}
            classes={{}}
            mediaProps={{}}
            cropperProps={{}}
            keyboardStep={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 font-label text-xs text-muted">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="accent-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 font-label text-xs text-muted">
            Rotate
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="accent-accent"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
