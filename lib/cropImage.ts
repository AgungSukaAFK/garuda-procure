// lib/cropImage.ts
// Menghasilkan File hasil crop (dengan rotasi) dari sumber gambar + area crop
// yang diberikan react-easy-crop.

import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

function rotatedSize(width: number, height: number, rotation: number) {
  const rad = toRad(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  fileName = "signature.png",
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung browser ini.");

  const { width: bw, height: bh } = rotatedSize(
    image.width,
    image.height,
    rotation,
  );

  // Gambar (dengan rotasi) ke canvas besar dulu.
  canvas.width = bw;
  canvas.height = bh;
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(toRad(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );

  // Set ukuran canvas ke area crop, tempel data.
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Gagal memproses gambar."));
        return;
      }
      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}
