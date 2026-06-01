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

// In-memory AsyncStorage mock. The package's shipped jest mock isn't resolvable
// in this environment, so we provide a self-contained store covering the surface
// the app uses (get/set/remove/clear and the multi* helpers).
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
      multiGet: jest.fn((keys: string[]) =>
        Promise.resolve(keys.map((k) => [k, store[k] ?? null])),
      ),
      multiSet: jest.fn((pairs: [string, string][]) => {
        for (const [k, v] of pairs) store[k] = v;
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        for (const k of keys) delete store[k];
        return Promise.resolve();
      }),
    },
  };
});

// Self-contained Reanimated mock (the package's shipped mock ships untranspiled
// TS that isn't in our transform allowlist). Covers the surface FlashcardDeck
// uses: Animated.View plus the shared-value/animated-style/timing/runOnJS hooks.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement(View, { ...props, ref }),
  );
  AnimatedView.displayName = 'AnimatedViewMock';
  const Animated = { View: AnimatedView };
  return {
    __esModule: true,
    default: Animated,
    // Stable ref across renders (matches real Reanimated; a fresh object each
    // render would retrigger effects that depend on the shared value's identity).
    useSharedValue: (initial: unknown) => React.useRef({ value: initial }).current,
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: unknown) => toValue,
    runOnJS: (fn: unknown) => fn,
  };
});

// Lightweight gesture-handler mock: GestureDetector passes children through and
// the Gesture builders are chainable no-ops. Component tests exercise the
// accessible button path rather than synthesizing pan gestures.
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makeGesture = () => {
    const gesture: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of ['onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize', 'activeOffsetX', 'failOffsetY', 'enabled']) {
      gesture[method] = () => gesture;
    }
    return gesture;
  };
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
    Gesture: { Pan: makeGesture, Tap: makeGesture },
  };
});
