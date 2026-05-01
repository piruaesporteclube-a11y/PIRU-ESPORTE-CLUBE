import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compressImage(base64Str: string, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

export function fixHtml2CanvasColors(element: HTMLElement) {
  const elements = element.querySelectorAll('*');
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(htmlEl);
    
    // Properties that might contain oklch/oklab
    const properties = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 'background'];
    
    properties.forEach((prop) => {
      const value = htmlEl.style[prop as any] || style.getPropertyValue(prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase()));
      
      if (value && (value.includes('oklch') || value.includes('oklab'))) {
        // Fallback to a safe color
        // If it's a theme variable, we try to replace it with a hex fallback
        if (value.includes('var(--theme-primary)') || htmlEl.classList.contains('text-theme-primary') || htmlEl.classList.contains('bg-theme-primary') || htmlEl.classList.contains('border-theme-primary')) {
          const fallback = '#EAB308';
          if (prop === 'color') htmlEl.style.color = fallback;
          else if (prop === 'backgroundColor' || prop === 'background') htmlEl.style.backgroundColor = fallback;
          else if (prop === 'borderColor') htmlEl.style.borderColor = fallback;
          else htmlEl.style[prop as any] = fallback;
        } else if (prop === 'backgroundColor' || prop === 'background') {
          htmlEl.style[prop as any] = '#18181b'; // zinc-900 fallback
        } else if (prop === 'color') {
          htmlEl.style.color = '#ffffff';
        } else if (prop === 'borderColor') {
          htmlEl.style.borderColor = '#27272a'; // zinc-800 fallback
        } else {
          htmlEl.style[prop as any] = 'currentColor';
        }
      }
    });
  });
}
