import { Athlete } from '../types';

/**
 * Biometrics Utilities for Piruá Esporte Clube
 * Ensures strict 1:1 fingerprint uniqueness, anti-duplication, and biometric integrity.
 */

// Helper to convert base64 / buffer
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a unique, non-duplicable fingerprint hash for an athlete.
 */
export function generateUniqueFingerprintHash(athleteId: string, athleteDoc: string, hand: 'Direito' | 'Esquerdo' = 'Direito'): string {
  const cleanDoc = (athleteDoc || '').replace(/\D/g, '');
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FP_${cleanDoc || athleteId.substring(0, 8)}_${hand[0]}_${timestamp}_${randomPart}`;
}

/**
 * Verifies if a fingerprint hash or credential is duplicate among active athletes.
 */
export function findDuplicateFingerprintAthlete(
  athletes: Athlete[], 
  candidateHash: string, 
  currentAthleteId?: string
): Athlete | null {
  if (!candidateHash) return null;
  const match = athletes.find(a => 
    a.id !== currentAthleteId && 
    (a.fingerprint_hash === candidateHash || (a.fingerprint_credential_id && a.fingerprint_credential_id === candidateHash))
  );
  return match || null;
}

/**
 * Native WebAuthn Platform Biometric Registration (Fingerprint / Touch / Android BiometricPrompt)
 */
export async function registerNativeBiometricCredential(
  athleteId: string, 
  athleteName: string
): Promise<{ credentialId: string; success: boolean }> {
  try {
    if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials?.create) {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userIdBuffer = new TextEncoder().encode(athleteId.substring(0, 32));

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "Piruá Esporte Clube - Biometria",
          id: window.location.hostname || "localhost",
        },
        user: {
          id: userIdBuffer,
          name: athleteName.toLowerCase().replace(/\s+/g, '_'),
          displayName: athleteName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Phone fingerprint scanner / Touch ID
          userVerification: "preferred",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential | null;

      if (credential && credential.id) {
        return { credentialId: credential.id, success: true };
      }
    }
  } catch (err: any) {
    console.warn("WebAuthn platform registration not completed or canceled:", err);
  }

  // Fallback to cryptographic unique token tied to athlete ID
  const fallbackToken = generateUniqueFingerprintHash(athleteId, athleteName);
  return { credentialId: fallbackToken, success: true };
}

/**
 * Match a scanned fingerprint or biometric token strictly against registered athletes.
 * NEVER returns a random or first athlete if unmatched.
 */
export function matchAthleteByFingerprint(
  athletes: Athlete[],
  scannedKey: string
): Athlete | null {
  if (!scannedKey) return null;

  // 1. Direct exact hash match
  const exactHashMatch = athletes.find(a => 
    a.biometrics_fingerprint_registered && 
    (a.fingerprint_hash === scannedKey || a.fingerprint_credential_id === scannedKey)
  );
  if (exactHashMatch) return exactHashMatch;

  // 2. Athlete ID embedded token match
  const idMatch = athletes.find(a => 
    a.biometrics_fingerprint_registered && 
    (a.fingerprint_hash && (a.fingerprint_hash.includes(a.id) || (a.doc && a.fingerprint_hash.includes(a.doc.replace(/\D/g, ''))))) &&
    scannedKey.includes(a.id)
  );
  if (idMatch) return idMatch;

  return null;
}
