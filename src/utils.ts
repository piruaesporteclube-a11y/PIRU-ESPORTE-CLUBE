import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compressImage(base64Str: string, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
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
    img.onerror = () => {
      console.warn("Image compression failed, returning original base64");
      resolve(base64Str);
    };
    img.src = base64Str;
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

export async function toBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  
  // Add cache-buster to bypass any browser CORS-cached response errors for external URLs
  let fetchUrl = url;
  if (url.startsWith('http')) {
    const isExternal = !url.includes(window.location.host);
    if (isExternal) {
      fetchUrl = url.includes('?') ? `${url}&cb=${Date.now()}` : `${url}?cb=${Date.now()}`;
    }
  }

  // Try direct client-side fetch FIRST (much faster, handles CORS-enabled domains like Unsplash natively)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(fetchUrl, { 
      mode: 'cors', 
      signal: controller.signal,
      credentials: 'omit'
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn('Direct fetch failed or was blocked by CORS, trying proxy...', e);
  }

  // Fallback to Server Proxy
  if (url.startsWith('http') && !url.includes(window.location.host)) {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(fetchUrl)}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn('Proxy fetch failed too', e);
    }
  }

  // Last resort: Canvas conversion
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(url); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png', 1.0));
      } catch (err) { 
        resolve(url); 
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
    setTimeout(() => resolve(url), 5000);
  });
}

export async function prepareElementForExport(element: HTMLElement, width = 360, height = 640): Promise<HTMLElement> {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = `flyer-export-clone-${Date.now()}`;
  
  Object.assign(clone.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: `${width}px`,
    height: `${height}px`,
    transform: 'none',
    transition: 'none',
    zIndex: '-9999',
    opacity: '1',
    pointerEvents: 'none',
    borderRadius: '0',
    margin: '0',
    padding: '0'
  });
  
  document.body.appendChild(clone);

  // Apply color fixes for oklch / tailwind theme variables
  fixHtml2CanvasColors(clone);

  // Clean styles (No animations, no transitions, no blurs)
  const allCloneElements = clone.querySelectorAll('*');
  allCloneElements.forEach((el: any) => {
    if (el.style) {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.backdropFilter = 'none';
      if (el.style.filter && el.style.filter.includes('blur')) {
        el.style.filter = 'none';
      }
    }
  });

  // Convert all <img> src attributes inside the clone to Base64
  const cloneImages = Array.from(clone.querySelectorAll('img'));
  await Promise.all(cloneImages.map(async (img) => {
    const currentSrc = img.getAttribute('src');
    if (currentSrc) {
      try {
        const b64 = await toBase64(currentSrc);
        img.src = b64;
        img.setAttribute('src', b64);
        img.setAttribute('crossorigin', 'anonymous');
      } catch (e) {
        console.warn('Failed to convert image to base64, sticking with original', currentSrc, e);
      }
    }
  }));

  // Convert all backgroundImage style URLs inside the clone to Base64 (preserving gradients!)
  const cloneBgElements = Array.from(clone.querySelectorAll('*')).filter(el => (el as HTMLElement).style.backgroundImage);
  await Promise.all(cloneBgElements.map(async (el) => {
    const bg = (el as HTMLElement).style.backgroundImage;
    const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
    if (match && match[1]) {
      try {
        const b64 = await toBase64(match[1]);
        (el as HTMLElement).style.backgroundImage = bg.replace(match[0], `url("${b64}")`);
      } catch (e) {
        console.warn('Failed to convert bg image to base64', match[1], e);
      }
    }
  }));

  // Ensure all images are completely loaded in the clone DOM
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  await document.fonts.ready;
  // Small delay to ensure rendering engine has applied all styles and base64 sources
  await new Promise(resolve => setTimeout(resolve, 800));

  return clone;
}
