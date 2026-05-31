import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sn_cert_prep.catalog_domain_by_exam.v1';

/**
 * Persisted map of examId → selected topic domain id, or `null` for "all domains".
 * Used by the catalog (Req 2.5) and later by quiz / simulator routes.
 */
export async function loadDomainSelections(): Promise<Record<string, string | null>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string | null>;
  } catch {
    return {};
  }
}

export async function persistDomainSelections(map: Record<string, string | null>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
