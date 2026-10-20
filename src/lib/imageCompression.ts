/**
 * Compressão de imagem no navegador antes do upload: redimensiona para no
 * máximo 1600px no maior lado e reencoda como JPEG. Além de caber no limite
 * de corpo da requisição, o reencode descarta metadados EXIF (incluindo GPS)
 * da foto original.
 */

export const IMAGE_COMPRESSION = {
  maxDimension: 1600,
  quality: 0.82,
  acceptedInputTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export function scaleToFit(width: number, height: number, maxDimension: number = IMAGE_COMPRESSION.maxDimension) {
  const largest = Math.max(width, height);
  if (largest <= maxDimension) {
    return { width, height };
  }
  const ratio = maxDimension / largest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function compressImageForUpload(file: File): Promise<File> {
  if (!(IMAGE_COMPRESSION.acceptedInputTypes as readonly string[]).includes(file.type)) {
    throw new Error("Formato não suportado. Envie uma foto JPEG, PNG ou WEBP.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = scaleToFit(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Não foi possível processar a imagem neste navegador.");
    }
    // Fundo branco para PNG/WEBP com transparência virarem JPEG legível.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", IMAGE_COMPRESSION.quality),
    );
    if (!blob) {
      throw new Error("Não foi possível processar a imagem neste navegador.");
    }
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
