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

export function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  
  // If it's a Brazilian number (10 digits: DDD + 8 digits), add the 9th digit
  if (clean.length === 10) {
    clean = clean.substring(0, 2) + '9' + clean.substring(2);
  }
  
  // If it has country code + DDD + 8 digits (12 digits)
  if (clean.length === 12 && clean.startsWith('55')) {
    clean = clean.substring(0, 4) + '9' + clean.substring(4);
  }

  return clean;
}

export function formatPhone(phone: string): string {
  const clean = normalizePhone(phone);
  
  if (clean.length === 11) { // DDD + 9 digits
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
  } else if (clean.length === 10) { // DDD + 8 digits
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  } else if (clean.length === 13) { // 55 + DDD + 9 digits
    return `+${clean.substring(0, 2)} (${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
  } else if (clean.length === 12) { // 55 + DDD + 8 digits
    return `+${clean.substring(0, 2)} (${clean.substring(2, 4)}) ${clean.substring(4, 8)}-${clean.substring(8)}`;
  }
  
  return phone;
}

export function fixHtml2CanvasColors(element: HTMLElement) {
  const elements = element.querySelectorAll('*');
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(htmlEl);
    
    // Properties that might contain oklch/oklab or variables
    const properties = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 'background', 'backgroundImage'];
    
    properties.forEach((prop) => {
      let value = htmlEl.style[prop as any] || style.getPropertyValue(prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase()));
      
      if (!value) return;

      // Handle oklch/oklab
      if (value.includes('oklch') || value.includes('oklab')) {
        // We try to get the actual computed RGB value
        // Note: window.getComputedStyle usually returns rgb() or rgba() for colors in modern browsers
        // even if they were specified as oklch in CSS. 
        // If it still says oklch, it means the browser might not be resolving it correctly for the computed style
        // OR html-to-image is picking up the CSS variable value instead.
        
        // Let's try to force a solid color fallback if it's a theme color
        if (value.includes('var(--theme-primary)') || htmlEl.classList.contains('text-theme-primary') || htmlEl.classList.contains('bg-theme-primary') || htmlEl.classList.contains('border-theme-primary')) {
          const fallback = '#EAB308';
          if (prop === 'color') htmlEl.style.color = fallback;
          else if (prop === 'backgroundColor') htmlEl.style.backgroundColor = fallback;
          else if (prop === 'borderColor') htmlEl.style.borderColor = fallback;
          else if (prop === 'background' && !value.includes('gradient')) htmlEl.style.background = fallback;
        } else {
          // General fallback for oklch -> rgb if browser supports it we try to "read" it back
          // If the computed value is still oklch, we must provide a hard fallback
          if (prop.toLowerCase().includes('background')) {
             if (value.includes('gradient')) {
               // Gradients are harder, but we can try to simplify them or just hope html-to-image handles them if we remove oklch
               htmlEl.style[prop as any] = value.replace(/oklch\(.*?\)/g, '#3f3f46'); // zinc-700
             } else {
               htmlEl.style[prop as any] = '#18181b'; // zinc-900
             }
          } else if (prop === 'color') {
            htmlEl.style.color = '#ffffff';
          } else if (prop === 'borderColor') {
            htmlEl.style.borderColor = '#3f3f46';
          }
        }
      }
      
      // Fix for background-image with variables or relative paths
      if (prop === 'backgroundImage' && value.includes('var(')) {
        // html-to-image sometimes struggles with variables in background images
        // But if it's just a gradient it should be fine if colors are resolved.
      }
    });
  });
}
