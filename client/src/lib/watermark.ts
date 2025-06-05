/**
 * Add a watermark to an image using canvas
 * @param imageUrl The URL of the image to watermark
 * @param text The text to use as watermark
 * @param options Watermark options
 * @returns Promise with the data URL of the watermarked image
 */
export async function addWatermark(
  imageUrl: string,
  text = "FIT-CREATE",
  options: {
    opacity?: number;
    position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
    fontSize?: number;
    color?: string;
    rotation?: number;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const {
      opacity = 0.7,
      position = "center",
      fontSize = 36,
      color = "rgba(255, 255, 255, 0.7)",
      rotation = -45
    } = options;

    const image = new Image();
    image.crossOrigin = "Anonymous";
    
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to get canvas context"));
        return;
      }
      
      // Draw the original image
      ctx.drawImage(image, 0, 0);
      
      // Set watermark properties
      ctx.globalAlpha = opacity;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      
      // Calculate position
      let x, y;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      
      switch (position) {
        case "top-left":
          x = textWidth / 2 + 10;
          y = textHeight + 10;
          break;
        case "top-right":
          x = canvas.width - textWidth / 2 - 10;
          y = textHeight + 10;
          break;
        case "bottom-left":
          x = textWidth / 2 + 10;
          y = canvas.height - 10;
          break;
        case "bottom-right":
          x = canvas.width - textWidth / 2 - 10;
          y = canvas.height - 10;
          break;
        case "center":
        default:
          x = canvas.width / 2;
          y = canvas.height / 2;
      }
      
      // Apply rotation if needed
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(text, -textWidth / 2, 0);
        ctx.restore();
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
      }
      
      // Return the watermarked image as data URL
      resolve(canvas.toDataURL("image/jpeg"));
    };
    
    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    image.src = imageUrl;
  });
}
