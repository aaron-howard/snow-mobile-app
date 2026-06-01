import {
  downloadExamContent,
  evaluateStorage,
  InsufficientStorageError,
  utf8ByteLength,
  type DownloadDeps,
  type ExamContentBundle,
} from '../examContentDownload';

// jest.mock is hoisted above the imports above by babel-jest.
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///docs/',
  getFreeDiskStorageAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

function emptyBundle(examId: string): ExamContentBundle {
  return { examId, questions: [], answerChoices: [], decks: [], flashcards: [] };
}

describe('evaluateStorage', () => {
  test('sufficient when available exceeds required', () => {
    expect(evaluateStorage(100, 200)).toEqual({
      requiredBytes: 100,
      availableBytes: 200,
      sufficient: true,
    });
  });
  test('sufficient when exactly equal', () => {
    expect(evaluateStorage(100, 100).sufficient).toBe(true);
  });
  test('insufficient when available is less than required', () => {
    expect(evaluateStorage(100, 99).sufficient).toBe(false);
  });
});

describe('utf8ByteLength', () => {
  test('counts ASCII as one byte each', () => {
    expect(utf8ByteLength('hello')).toBe(5);
  });
  test('counts multi-byte characters correctly', () => {
    expect(utf8ByteLength('é')).toBe(2); // U+00E9
    expect(utf8ByteLength('€')).toBe(3); // U+20AC
    expect(utf8ByteLength('😀')).toBe(4); // surrogate pair
  });
});

describe('downloadExamContent', () => {
  test('writes the bundle and returns a manifest when storage is sufficient (Req 9.1)', async () => {
    const writeBundle = jest.fn().mockResolvedValue(undefined);
    const deps: DownloadDeps = {
      loadBundle: async (id) => emptyBundle(id),
      getFreeDiskStorage: async () => 10_000_000,
      writeBundle,
      now: () => 1_700_000_000_000,
    };

    const manifest = await downloadExamContent('exam-1', deps);
    expect(writeBundle).toHaveBeenCalledTimes(1);
    expect(manifest.examId).toBe('exam-1');
    expect(manifest.downloadedAt).toBe(1_700_000_000_000);
    expect(manifest.counts).toEqual({ questions: 0, answerChoices: 0, decks: 0, flashcards: 0 });
    expect(manifest.bytes).toBeGreaterThan(0);
  });

  test('halts without writing when storage is insufficient (Req 9.2)', async () => {
    const writeBundle = jest.fn();
    const deps: DownloadDeps = {
      loadBundle: async (id) => emptyBundle(id),
      getFreeDiskStorage: async () => 0,
      writeBundle,
    };

    await expect(downloadExamContent('exam-1', deps)).rejects.toBeInstanceOf(
      InsufficientStorageError,
    );
    expect(writeBundle).not.toHaveBeenCalled();
  });
});
