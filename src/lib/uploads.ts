/**
 * Validação de upload de imagens no servidor. O tipo do arquivo é decidido
 * pelos bytes iniciais (assinatura/"magic bytes"), nunca pela extensão nem
 * pelo Content-Type declarado pelo navegador, e o nome no Storage é sempre
 * gerado aqui (o nome original do usuário não é usado).
 */

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

export const IMAGE_UPLOAD_RULES = {
  /** Limite por arquivo aceito pelo servidor (o cliente comprime antes). */
  maxBytes: 3 * 1024 * 1024,
  maxRequestPhotos: 5,
  extensions: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  } satisfies Record<AllowedImageMime, string>,
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export type ImageValidationResult =
  | { ok: true; mime: AllowedImageMime; extension: string; bytes: Uint8Array }
  | { ok: false; error: string };

export function validateImageBytes(bytes: Uint8Array): ImageValidationResult {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Arquivo vazio." };
  }
  if (bytes.byteLength > IMAGE_UPLOAD_RULES.maxBytes) {
    return { ok: false, error: "Imagem muito grande (máximo de 3 MB após compressão)." };
  }
  const mime = detectImageMime(bytes);
  if (!mime) {
    return { ok: false, error: "Formato não suportado. Envie uma foto JPEG, PNG ou WEBP." };
  }
  return { ok: true, mime, extension: IMAGE_UPLOAD_RULES.extensions[mime], bytes };
}

export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // Checa o tamanho antes de ler o conteúdo para não carregar arquivos gigantes.
  if (file.size > IMAGE_UPLOAD_RULES.maxBytes) {
    return { ok: false, error: "Imagem muito grande (máximo de 3 MB após compressão)." };
  }
  return validateImageBytes(new Uint8Array(await file.arrayBuffer()));
}

/**
 * Caminho do objeto no Storage: `{pasta}/{uuid}.{ext}`. A pasta precisa ser
 * um UUID (id do usuário ou do pedido), que é o que as policies de Storage
 * usam para autorizar leitura/escrita.
 */
export function buildImageObjectPath(folderId: string, extension: string, objectId: string = crypto.randomUUID()) {
  if (!UUID_PATTERN.test(folderId) || !UUID_PATTERN.test(objectId)) {
    throw new Error("invalid_storage_folder");
  }
  if (!Object.values(IMAGE_UPLOAD_RULES.extensions).includes(extension as never)) {
    throw new Error("invalid_storage_extension");
  }
  return `${folderId.toLowerCase()}/${objectId.toLowerCase()}.${extension}`;
}

/** Arquivos de imagem válidos (não vazios) de um campo multipart. */
export function getUploadedFiles(formData: FormData, field: string) {
  return formData.getAll(field).filter((item): item is File => item instanceof File && item.size > 0);
}
