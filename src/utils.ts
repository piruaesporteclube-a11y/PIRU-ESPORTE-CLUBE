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

export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`;
  }
  return cpf;
}

export function formatCPFOrRG(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`;
  }
  return value.toUpperCase();
}

export function fixHtml2CanvasColors(element: HTMLElement, isLightMode = false) {
  const elements = [element, ...Array.from(element.querySelectorAll('*'))];
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(htmlEl);
    const classStr = typeof htmlEl.className === 'string' ? htmlEl.className : '';
    
    // Properties that might contain oklch/oklab or variables
    const properties = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 'background', 'backgroundImage'];
    
    // Quick regex helpers for Tailwind opacity classes
    const getAlpha = (match: RegExpMatchArray | null, defaultAlpha = 1) => {
      if (!match) return defaultAlpha;
      if (match[2]) return parseInt(match[2], 10) / 100;
      return 1;
    };

    // Check dark background classes with support for opacity (e.g. bg-black, bg-black/90, bg-zinc-950/95)
    const matchBlack = classStr.match(/\bbg-black(\/(\d+))?\b/);
    const matchZinc950 = classStr.match(/\bbg-zinc-950(\/(\d+))?\b/);
    const matchZinc900 = classStr.match(/\bbg-zinc-900(\/(\d+))?\b/);
    const matchZinc850 = classStr.match(/\bbg-zinc-850(\/(\d+))?\b/);
    const matchZinc800 = classStr.match(/\bbg-zinc-800(\/(\d+))?\b/);
    const matchZinc700 = classStr.match(/\bbg-zinc-700(\/(\d+))?\b/);
    const matchWhite = classStr.match(/\bbg-white(\/(\d+))?\b/);

    if (matchBlack) {
      const a = getAlpha(matchBlack);
      htmlEl.style.backgroundColor = a === 1 ? '#000000' : `rgba(0, 0, 0, ${a})`;
    } else if (matchZinc950) {
      const a = getAlpha(matchZinc950);
      htmlEl.style.backgroundColor = a === 1 ? '#09090b' : `rgba(9, 9, 11, ${a})`;
    } else if (matchZinc900) {
      const a = getAlpha(matchZinc900);
      htmlEl.style.backgroundColor = a === 1 ? '#18181b' : `rgba(24, 24, 27, ${a})`;
    } else if (matchZinc850) {
      const a = getAlpha(matchZinc850);
      htmlEl.style.backgroundColor = a === 1 ? '#202024' : `rgba(32, 32, 36, ${a})`;
    } else if (matchZinc800) {
      const a = getAlpha(matchZinc800);
      htmlEl.style.backgroundColor = a === 1 ? '#27272a' : `rgba(39, 39, 42, ${a})`;
    } else if (matchZinc700) {
      const a = getAlpha(matchZinc700);
      htmlEl.style.backgroundColor = a === 1 ? '#3f3f46' : `rgba(63, 63, 70, ${a})`;
    } else if (matchWhite) {
      const a = getAlpha(matchWhite);
      htmlEl.style.backgroundColor = a === 1 ? '#ffffff' : `rgba(255, 255, 255, ${a})`;
    }

    // Check text color classes
    if (/\btext-black\b/.test(classStr)) {
      htmlEl.style.color = '#000000';
    } else if (/\btext-white\b/.test(classStr)) {
      htmlEl.style.color = '#ffffff';
    } else if (/\btext-theme-primary\b/.test(classStr) || /\btext-yellow-400\b/.test(classStr) || /\btext-yellow-500\b/.test(classStr) || /\btext-amber-400\b/.test(classStr) || /\btext-amber-500\b/.test(classStr)) {
      htmlEl.style.color = '#EAB308';
    } else if (/\btext-zinc-100\b/.test(classStr)) {
      htmlEl.style.color = '#f4f4f5';
    } else if (/\btext-zinc-200\b/.test(classStr)) {
      htmlEl.style.color = '#e4e4e7';
    } else if (/\btext-zinc-300\b/.test(classStr)) {
      htmlEl.style.color = '#d4d4d8';
    } else if (/\btext-zinc-400\b/.test(classStr)) {
      htmlEl.style.color = '#a1a1aa';
    } else if (/\btext-zinc-500\b/.test(classStr)) {
      htmlEl.style.color = '#71717a';
    } else if (/\btext-zinc-600\b/.test(classStr)) {
      htmlEl.style.color = '#52525b';
    } else if (/\btext-zinc-700\b/.test(classStr)) {
      htmlEl.style.color = '#3f3f46';
    }

    // Check border color classes
    if (/\bborder-theme-primary\b/.test(classStr)) {
      htmlEl.style.borderColor = '#EAB308';
    } else if (/\bborder-zinc-800\b/.test(classStr)) {
      htmlEl.style.borderColor = '#27272a';
    } else if (/\bborder-zinc-700\b/.test(classStr)) {
      htmlEl.style.borderColor = '#3f3f46';
    } else if (/\bborder-zinc-900\b/.test(classStr)) {
      htmlEl.style.borderColor = '#18181b';
    } else if (/\bborder-zinc-850\b/.test(classStr)) {
      htmlEl.style.borderColor = '#202024';
    } else if (/\bborder-black\b/.test(classStr)) {
      htmlEl.style.borderColor = '#000000';
    }

    properties.forEach((prop) => {
      let value = htmlEl.style[prop as any] || style.getPropertyValue(prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase()));
      if (!value) return;

      // DO NOT touch gradients, background images, or radial/linear background styles
      if (prop === 'background' || prop === 'backgroundImage') {
        if (value.includes('gradient') || value.includes('url(') || (htmlEl.style.background && htmlEl.style.background.includes('gradient'))) {
          return;
        }
      }

      // Check if computed background color is transparent or has 0 alpha
      const isTransparentBg = 
        value === 'transparent' || 
        value === 'rgba(0, 0, 0, 0)' || 
        value === 'rgba(255, 255, 255, 0)' || 
        value.includes('/ 0)') || 
        value.includes('0 / 0') ||
        value.includes(', 0)') ||
        value === 'none';

      // Detect and convert theme-primary / theme-secondary variables or classes
      const isThemePrimary = 
        value.includes('var(--theme-primary)') || 
        value.includes('var(--color-theme-primary)') ||
        value.includes('#EAB308') ||
        value.includes('rgb(234, 179, 8)');

      const isThemeSecondary = 
        value.includes('var(--theme-secondary)') || 
        value.includes('var(--color-theme-secondary)');

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
        const fallback = isLightMode ? '#000000' : '#ffffff';
        if (prop === 'color') htmlEl.style.color = fallback;
        else if (prop === 'backgroundColor') htmlEl.style.backgroundColor = fallback;
        else if (prop === 'borderColor') htmlEl.style.borderColor = fallback;
        else if (prop === 'background' && !value.includes('gradient')) htmlEl.style.background = fallback;
        else if (prop === 'fill') htmlEl.style.fill = fallback;
        else if (prop === 'stroke') htmlEl.style.stroke = fallback;
        return;
      }

      // Handle oklch / oklab or general variables or modern color() fallback
      if (value.includes('oklch') || value.includes('oklab') || value.includes('color(') || value.includes('color-mix') || value.includes('var(')) {
        if (prop === 'color') {
          if (!htmlEl.style.color || htmlEl.style.color.includes('oklch') || htmlEl.style.color.includes('var(')) {
            htmlEl.style.color = isLightMode ? '#000000' : '#ffffff';
          }
        } else if (prop === 'backgroundColor') {
          if (isTransparentBg) {
            htmlEl.style.backgroundColor = 'transparent';
          } else if (!htmlEl.style.backgroundColor || htmlEl.style.backgroundColor.includes('oklch')) {
            htmlEl.style.backgroundColor = isLightMode ? '#ffffff' : '#000000';
          }
        } else if (prop === 'borderColor') {
          if (!htmlEl.style.borderColor || htmlEl.style.borderColor.includes('oklch')) {
            htmlEl.style.borderColor = isLightMode ? '#e5e7eb' : '#27272a';
          }
        } else if (prop === 'background') {
          if (!value.includes('gradient') && !value.includes('url(') && !isTransparentBg) {
            htmlEl.style.background = isLightMode ? '#ffffff' : '#000000';
          }
        }
      }
    });
  });
}

export async function toBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  
  // Make relative URLs absolute to ensure correct routing within sandboxed iframes
  let cleanUrl = url;
  if (url.startsWith('/')) {
    cleanUrl = `${window.location.origin}${url}`;
  }

  const fallbackSvgString = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="55%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <linearGradient id="grassGlow" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#15803d"/>
        <stop offset="100%" stop-color="#166534" stop-opacity="0.2"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1600" fill="url(#bgGlow)"/>
    <rect y="800" width="1200" height="800" fill="url(#grassGlow)"/>
    <circle cx="600" cy="400" r="350" fill="#38bdf8" opacity="0.12"/>
  </svg>`;
  const fallbackDataUri = `data:image/svg+xml;base64,${btoa(fallbackSvgString)}`;

  // Determine if URL is external to the app
  const isExternal = cleanUrl.startsWith('http') && !cleanUrl.includes(window.location.host);

  // 1. Try server proxy FIRST for external URLs (most reliable in sandboxed iframe environment)
  if (isExternal) {
    const proxyUrl = `${window.location.origin}/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type && blob.type.startsWith('image/')) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              if (res && res.startsWith('data:image/')) {
                resolve(res);
              } else {
                resolve(fallbackDataUri);
              }
            };
            reader.onerror = () => resolve(fallbackDataUri);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (e) {
      console.warn('Proxy fetch failed, trying direct client fetch...', e);
    }
  }

  // 2. Direct client-side fetch fallback
  try {
    const clientFetchUrl = isExternal ? (cleanUrl.includes('?') ? `${cleanUrl}&cb=${Date.now()}` : `${cleanUrl}?cb=${Date.now()}`) : cleanUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(clientFetchUrl, { 
      mode: 'cors', 
      signal: controller.signal,
      credentials: 'omit'
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.type && blob.type.startsWith('image/')) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            if (res && res.startsWith('data:image/')) {
              resolve(res);
            } else {
              resolve(fallbackDataUri);
            }
          };
          reader.onerror = () => resolve(fallbackDataUri);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch (e) {
    console.warn('Direct fetch failed or was blocked by CORS', e);
  }

  // 3. Last resort fallback: standard crossOrigin Canvas conversion
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 800;
        canvas.height = img.height || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(fallbackDataUri); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) { 
        resolve(fallbackDataUri); 
      }
    };
    img.onerror = () => resolve(fallbackDataUri);
    img.src = cleanUrl;
    setTimeout(() => resolve(fallbackDataUri), 2500);
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

  // Clean styles (No animations, no transitions, no blurs, no mix-blend-mode conflicts)
  const allCloneElements = clone.querySelectorAll('*');
  allCloneElements.forEach((el: any) => {
    if (el.style) {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.backdropFilter = 'none';
      if (el.style.mixBlendMode && el.style.mixBlendMode !== 'normal') {
        el.style.mixBlendMode = 'normal';
      }
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

  // Convert all backgroundImage style URLs inside the clone to Base64 (preserving gradients, multiple layers!)
  const cloneBgElements = Array.from(clone.querySelectorAll('*')).filter(el => (el as HTMLElement).style.backgroundImage);
  await Promise.all(cloneBgElements.map(async (el) => {
    let bg = (el as HTMLElement).style.backgroundImage;
    const urlRegex = /url\(['"]?([^'"]+?)['"]?\)/g;
    let match;
    const replacements: { original: string; b64: string }[] = [];
    
    urlRegex.lastIndex = 0;
    while ((match = urlRegex.exec(bg)) !== null) {
      const originalUrl = match[1];
      const matchString = match[0];
      try {
        const b64 = await toBase64(originalUrl);
        replacements.push({ original: matchString, b64: `url("${b64}")` });
      } catch (e) {
        console.warn('Failed to convert bg image to base64', originalUrl, e);
      }
    }
    
    // Apply all replacements in the style string
    replacements.forEach(({ original, b64 }) => {
      bg = bg.replace(original, b64);
    });
    
    (el as HTMLElement).style.backgroundImage = bg;
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
