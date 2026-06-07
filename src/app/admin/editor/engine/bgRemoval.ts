import { removeBackground } from "@imgly/background-removal";

let isLoading = false;

export async function removeBg(
  src: HTMLImageElement,
  onProgress?: (p: number) => void
): Promise<HTMLImageElement> {
  if (isLoading) throw new Error("Ya hay un proceso en curso");
  isLoading = true;
  try {
    const response = await fetch(src.src);
    const blob = await response.blob();
    const resultBlob = await removeBackground(blob, {
      progress: (key, current, total) => {
        if (onProgress) onProgress(Math.round((current / total) * 100));
      },
    });
    const url = URL.createObjectURL(resultBlob);
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
  } finally {
    isLoading = false;
  }
}




