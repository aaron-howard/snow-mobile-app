import * as FileSystem from 'expo-file-system';

import type {
  AnswerChoiceDTO,
  DeckDTO,
  FlashcardDTO,
  QuestionDTO,
} from '@db/repositories/types';

/** Where downloaded exam bundles live on device. */
export const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ''}exam-content/`;

/** Result of comparing required vs. available storage before a download. */
export interface StorageEstimate {
  requiredBytes: number;
  availableBytes: number;
  sufficient: boolean;
}

/** Bundle of all of an exam's content persisted for offline use (Req 9.1). */
export interface ExamContentBundle {
  examId: string;
  questions: QuestionDTO[];
  answerChoices: AnswerChoiceDTO[];
  decks: DeckDTO[];
  flashcards: FlashcardDTO[];
}

/** Manifest recorded alongside a download; `downloadedAt` drives staleness (Req 9.8). */
export interface DownloadManifest {
  examId: string;
  downloadedAt: number;
  bytes: number;
  counts: {
    questions: number;
    answerChoices: number;
    decks: number;
    flashcards: number;
  };
}

/** Thrown when there isn't enough free space; no partial content is written (Req 9.2). */
export class InsufficientStorageError extends Error {
  constructor(public readonly estimate: StorageEstimate) {
    super(
      `Insufficient storage to download exam content: requires ${estimate.requiredBytes} bytes but only ${estimate.availableBytes} available.`,
    );
    this.name = 'InsufficientStorageError';
  }
}

/** Pure storage decision (Requirement 9.2). Download proceeds only when sufficient. */
export function evaluateStorage(requiredBytes: number, availableBytes: number): StorageEstimate {
  return { requiredBytes, availableBytes, sufficient: availableBytes >= requiredBytes };
}

/** UTF-8 byte length without relying on Buffer (RN/Hermes-safe). */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4; // surrogate pair -> 4 bytes; skip the low surrogate
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** Injectable side effects so the orchestrator can be unit-tested without native FS. */
export interface DownloadDeps {
  loadBundle: (examId: string) => Promise<ExamContentBundle>;
  getFreeDiskStorage: () => Promise<number>;
  writeBundle: (examId: string, json: string) => Promise<void>;
  now?: () => number;
}

/**
 * Download and persist all content for an exam (Req 9.1). Estimates the required
 * bytes, checks free space first, and halts with {@link InsufficientStorageError}
 * — writing nothing — when space is insufficient (Req 9.2).
 */
export async function downloadExamContent(
  examId: string,
  deps: DownloadDeps,
): Promise<DownloadManifest> {
  const bundle = await deps.loadBundle(examId);
  const downloadedAt = deps.now ? deps.now() : Date.now();

  const counts = {
    questions: bundle.questions.length,
    answerChoices: bundle.answerChoices.length,
    decks: bundle.decks.length,
    flashcards: bundle.flashcards.length,
  };
  const json = JSON.stringify({ ...bundle, downloadedAt, counts });
  const requiredBytes = utf8ByteLength(json);

  const availableBytes = await deps.getFreeDiskStorage();
  const estimate = evaluateStorage(requiredBytes, availableBytes);
  if (!estimate.sufficient) throw new InsufficientStorageError(estimate);

  await deps.writeBundle(examId, json);
  return { examId, downloadedAt, bytes: requiredBytes, counts };
}

/** Assemble an exam bundle from the local repositories. */
async function defaultLoadBundle(examId: string): Promise<ExamContentBundle> {
  // Imported lazily so this module doesn't pull in the native SQLite adapter
  // (and thus can be unit-tested with injected deps).
  const { createRepositories } = await import('@db/repositories');
  const repos = createRepositories();
  const questions = await repos.questions.getPoolForSession(examId);
  const answerChoices = (
    await Promise.all(questions.map((q) => repos.answerChoices.listByQuestion(q.id)))
  ).flat();
  const decks = await repos.decks.listByExam(examId);
  const flashcards = (
    await Promise.all(decks.map((d) => repos.flashcards.listByDeck(d.id)))
  ).flat();
  return { examId, questions, answerChoices, decks, flashcards };
}

async function defaultWriteBundle(examId: string, json: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true }).catch(() => {
    // Directory already exists — ignore.
  });
  await FileSystem.writeAsStringAsync(`${DOWNLOAD_DIR}${examId}.json`, json);
}

/** Production deps backed by Expo FileSystem + the local repositories. */
export const defaultDownloadDeps: DownloadDeps = {
  loadBundle: defaultLoadBundle,
  getFreeDiskStorage: () => FileSystem.getFreeDiskStorageAsync(),
  writeBundle: defaultWriteBundle,
};

/** Read a previously-written manifest, or null if the exam isn't downloaded. */
export async function readDownloadManifest(examId: string): Promise<DownloadManifest | null> {
  try {
    const path = `${DOWNLOAD_DIR}${examId}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as { examId: string; downloadedAt: number; counts: DownloadManifest['counts'] };
    return {
      examId: parsed.examId,
      downloadedAt: parsed.downloadedAt,
      bytes: utf8ByteLength(raw),
      counts: parsed.counts,
    };
  } catch {
    return null;
  }
}
