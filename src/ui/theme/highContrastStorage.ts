import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sn_cert_prep.high_contrast.v1';

/**
 * Load the persisted high-contrast preference (Req 10.6). Returns `null` when no
 * preference has been saved yet, so the provider can keep its initial value.
 * Never throws — storage failures degrade to "no stored preference".
 */
export async function loadHighContrastPreference(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}

/** Persist the high-contrast preference. Never throws. */
export async function persistHighContrastPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Best-effort; a failed write just means the choice isn't remembered.
  }
}
