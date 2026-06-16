export async function downloadImageAsset(src: string, filename: string) {
  const safeName = filename.replace(/[^\w.-]+/g, "_").slice(0, 80) || "mekkz-image";

  if (src.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = src;
    link.download = safeName.endsWith(".png") ? safeName : `${safeName}.png`;
    link.click();
    return;
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error("Bild konnte nicht geladen werden.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = safeName.endsWith(".png") ? safeName : `${safeName}.png`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
