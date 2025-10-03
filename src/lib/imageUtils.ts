import imageCompression from "browser-image-compression";

export async function compressImageFileToWebP(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.3,              // 🔹 máximo ~300KB
    maxWidthOrHeight: 1200,      // 🔹 redimensionar si es más grande que 1200px
    useWebWorker: true,
    fileType: "image/webp",      // 🔹 convertir a WebP
  };

  const compressedFile = await imageCompression(file, options);

  // Aseguramos que el nombre termine en .webp
  return new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}