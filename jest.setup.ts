// Jest setup — runs before the test framework loads.
// Keep this lean; per-test extensions go in __tests__ helpers.

// Polyfill TextEncoder/TextDecoder if a dependency expects them in Node test env.
import { TextDecoder, TextEncoder } from 'util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextEncoder = (global as any).TextEncoder ?? TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoder = (global as any).TextDecoder ?? TextDecoder;

// Silence React Native warnings that fire in jsdom but don't reflect real RN behavior.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
