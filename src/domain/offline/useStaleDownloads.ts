import { useEffect, useState } from 'react';
import { createRepositories } from '@db/repositories';
import { readDownloadManifest } from '@/offline/examContentDownload';
import { ContentStalenessChecker } from './ContentStalenessChecker';

/**
 * Returns true when any enrolled exam's downloaded content is more than 30 days
 * old (Requirement 9.8). Best-effort: missing manifests and read errors are
 * treated as "not stale".
 */
export function useStaleDownloads(): boolean {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const repos = createRepositories();
        const exams = await repos.exams.listEnrolled();
        const today = new Date();
        for (const exam of exams) {
          const manifest = await readDownloadManifest(exam.id);
          if (
            manifest &&
            ContentStalenessChecker.isStale(new Date(manifest.downloadedAt), today)
          ) {
            if (!cancelled) setStale(true);
            return;
          }
        }
      } catch {
        // Best-effort; leave `stale` as-is.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stale;
}
