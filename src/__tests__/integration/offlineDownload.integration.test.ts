// Integration test (Task 15.4): offline download + content-availability check.
// Downloads an exam bundle through the FileSystem layer, then reads the manifest
// back and confirms the content is available and not stale. Requirements 9.1, 9.8.

import * as FileSystem from 'expo-file-system';
import {
  DOWNLOAD_DIR,
  downloadExamContent,
  readDownloadManifest,
  type DownloadDeps,
  type ExamContentBundle,
} from '../../offline/examContentDownload';
import { ContentStalenessChecker } from '@domain/offline/ContentStalenessChecker';

const mockFsStore = new Map<string, string>();

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///docs/',
  getFreeDiskStorageAsync: jest.fn(async () => 50_000_000),
  makeDirectoryAsync: jest.fn(async () => undefined),
  writeAsStringAsync: jest.fn(async (path: string, contents: string) => {
    mockFsStore.set(path, contents);
  }),
  getInfoAsync: jest.fn(async (path: string) => ({ exists: mockFsStore.has(path) })),
  readAsStringAsync: jest.fn(async (path: string) => {
    const value = mockFsStore.get(path);
    if (value === undefined) throw new Error(`not found: ${path}`);
    return value;
  }),
}));

const NOW = 1_700_000_000_000;

function bundle(examId: string): ExamContentBundle {
  return {
    examId,
    questions: [],
    answerChoices: [],
    decks: [],
    flashcards: [],
  };
}

const deps: DownloadDeps = {
  loadBundle: async (id) => bundle(id),
  getFreeDiskStorage: () => FileSystem.getFreeDiskStorageAsync(),
  writeBundle: async (examId, json) => {
    await FileSystem.writeAsStringAsync(`${DOWNLOAD_DIR}${examId}.json`, json);
  },
  now: () => NOW,
};

describe('integration: offline download and availability', () => {
  beforeEach(() => mockFsStore.clear());

  test('downloaded content is readable back and reported fresh', async () => {
    const manifest = await downloadExamContent('exam-1', deps);
    expect(manifest.examId).toBe('exam-1');

    // Availability: the manifest can be read back from "disk".
    const readBack = await readDownloadManifest('exam-1');
    expect(readBack).not.toBeNull();
    expect(readBack!.downloadedAt).toBe(NOW);

    // Freshly downloaded content is not stale.
    expect(
      ContentStalenessChecker.isStale(new Date(readBack!.downloadedAt), new Date(NOW)),
    ).toBe(false);

    // ...but becomes stale 31 days later.
    const later = new Date(NOW + 31 * 24 * 60 * 60 * 1000);
    expect(ContentStalenessChecker.isStale(new Date(readBack!.downloadedAt), later)).toBe(true);
  });

  test('an exam that was never downloaded has no manifest', async () => {
    expect(await readDownloadManifest('exam-never')).toBeNull();
  });
});
