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

      // FIRST: Unconditionally detect and convert theme-primary / theme-secondary variables or classes
      const isThemePrimary = 
        value.includes('var(--theme-primary)') || 
        value.includes('var(--color-theme-primary)') ||
        value.includes('#EAB308') ||
        value.includes('rgb(234, 179, 8)') ||
        htmlEl.classList.contains('text-theme-primary') && prop === 'color' ||
        htmlEl.classList.contains('bg-theme-primary') && prop === 'backgroundColor' ||
        htmlEl.classList.contains('border-theme-primary') && prop === 'borderColor';

      const isThemeSecondary = 
        value.includes('var(--theme-secondary)') || 
        value.includes('var(--color-theme-secondary)') ||
        htmlEl.classList.contains('text-theme-secondary') && prop === 'color' ||
        htmlEl.classList.contains('bg-theme-secondary') && prop === 'backgroundColor' ||
        htmlEl.classList.contains('border-theme-secondary') && prop === 'borderColor';

      if (isThemePrimary) {
        const fallback = '#EAB308';
        if (prop === 'color') htmlEl.style.color = fallback;
        else if (prop === 'backgroundColor') htmlEl.style.backgroundColor = fallback;
        else if (prop === 'borderColor') htmlEl.style.borderColor = fallback;
        else if (prop === 'background' && !value.includes('gradient')) htmlEl.style.background = fallback;
        else if (prop === 'fill') htmlEl.style.fill = fallback;
        else if (prop === 'stroke') htmlEl.style.stroke = fallback;
        return;
      }

      if (isThemeSecondary) {
        const fallback = '#000000';
        if (prop === 'color') htmlEl.style.color = fallback;
        else if (prop === 'backgroundColor') htmlEl.style.backgroundColor = fallback;
        else if (prop === 'borderColor') htmlEl.style.borderColor = fallback;
        else if (prop === 'background' && !value.includes('gradient')) htmlEl.style.background = fallback;
        else if (prop === 'fill') htmlEl.style.fill = fallback;
        else if (prop === 'stroke') htmlEl.style.stroke = fallback;
        return;
      }

      // SECOND: Handle oklch / oklab or general variables fallback
      if (value.includes('oklch') || value.includes('oklab') || value.includes('var(')) {
        if (prop === 'color') {
          if (htmlEl.classList.contains('text-zinc-500')) {
            htmlEl.style.color = '#71717a';
          } else if (htmlEl.classList.contains('text-zinc-400')) {
            htmlEl.style.color = '#a1a1aa';
          } else if (htmlEl.classList.contains('text-zinc-300')) {
            htmlEl.style.color = '#d4d4d8';
          } else if (htmlEl.classList.contains('text-zinc-600')) {
            htmlEl.style.color = '#52525b';
          } else {
            // Default white text
            htmlEl.style.color = '#ffffff';
          }
        } else if (prop === 'backgroundColor') {
          if (htmlEl.classList.contains('bg-zinc-900')) {
            htmlEl.style.backgroundColor = '#18181b';
          } else if (htmlEl.classList.contains('bg-zinc-950')) {
            htmlEl.style.backgroundColor = '#09090b';
          } else if (htmlEl.classList.contains('bg-zinc-800')) {
            htmlEl.style.backgroundColor = '#27272a';
          } else if (htmlEl.classList.contains('bg-zinc-700')) {
            htmlEl.style.backgroundColor = '#3f3f46';
          } else {
            htmlEl.style.backgroundColor = '#000000';
          }
        } else if (prop === 'borderColor') {
          htmlEl.style.borderColor = '#3f3f46';
        } else if (prop === 'background') {
          if (value.includes('gradient')) {
            htmlEl.style.background = value.replace(/oklch\(.*?\)/g, '#000000');
          } else {
            htmlEl.style.background = '#000000';
          }
        }
      }
    });
  });
}
