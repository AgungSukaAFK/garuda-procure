"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";

export interface CropData {
  croppedAreaPixels: Area;
  rotation: number;
}

const RATIOS: { label: string; value: number }[] = [
  { label: "1:1", value: 1 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:1", value: 2 },
  { label: "3:1", value: 3 },
  { label: "4:1", value: 4 },
];

interface Props {
  imageSrc: string;
  onChange: (data: CropData) => void;
}

export function SignatureCropper({ imageSrc, onChange }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); // zoom react-easy-crop (0.5–2)
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(3); // default 3:1 (tanda tangan biasanya lebar)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  useEffect(() => {
    if (croppedAreaPixels) onChange({ croppedAreaPixels, rotation });
  }, [croppedAreaPixels, rotation, onChange]);

  // Slider zoom -100%..100% (default 0) dipetakan ke zoom = 2^(pct/100).
  const zoomPct = Math.round(100 * Math.log2(zoom));
  const setZoomPct = (pct: number) => setZoom(Math.pow(2, pct / 100));

  return (
    <div className="space-y-3">
      <div className="relative h-56 w-full overflow-hidden rounded-md border bg-muted">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          minZoom={0.5}
          maxZoom={2}
          restrictPosition={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      <div>
        <span className="text-xs font-medium">Rasio bingkai</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {RATIOS.map((r) => (
            <Button
              key={r.label}
              type="button"
              size="sm"
              variant={aspect === r.value ? "default" : "outline"}
              onClick={() => setAspect(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Zoom</span>
          <span className="text-muted-foreground">{zoomPct}%</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={zoomPct}
          onChange={(e) => setZoomPct(Number(e.target.value))}
          className="mt-1 w-full accent-primary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Rotasi</span>
          <span className="text-muted-foreground">{rotation}&deg;</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="mt-1 w-full accent-primary"
        />
      </div>
    </div>
  );
}
