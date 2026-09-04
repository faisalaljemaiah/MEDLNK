export type PixelCrop = { x: number; y: number; width: number; height: number };

const MAX_OUTPUT_PX = 640;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image")));
    image.src = src;
  });
}

/**
 * Renders the rotated, cropped region a user picked in AvatarCropper to a
 * single square File — always re-encoded to JPEG (canvas.toBlob), which
 * incidentally means the output is guaranteed to be a real decodable raster
 * image regardless of what the source file claimed to be.
 *
 * Two canvases, not one: the source image is drawn rotated onto a canvas
 * sized to its own rotated bounding box first, because `crop` (from
 * react-easy-crop's onCropComplete) is expressed in that rotated
 * coordinate space, not the original image's. Downscaled to at most
 * MAX_OUTPUT_PX on a side on the way out — an avatar never needs more than
 * that, and capping it keeps the upload small no matter how large the
 * source photo was.
 */
export async function cropImageToFile(
  imageSrc: string,
  crop: PixelCrop,
  rotationDeg: number,
  fileName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const rotRad = (rotationDeg * Math.PI) / 180;

  const rotatedWidth =
    Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const rotatedHeight =
    Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = rotatedWidth;
  rotatedCanvas.height = rotatedHeight;
  const rotatedCtx = rotatedCanvas.getContext("2d");
  if (!rotatedCtx) throw new Error("Canvas not supported");

  rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotatedCtx.rotate(rotRad);
  rotatedCtx.translate(-image.width / 2, -image.height / 2);
  rotatedCtx.drawImage(image, 0, 0);

  const outputSize = Math.min(MAX_OUTPUT_PX, crop.width);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputSize;
  outputCanvas.height = outputSize;
  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) throw new Error("Canvas not supported");

  outputCtx.drawImage(
    rotatedCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export image"));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}
