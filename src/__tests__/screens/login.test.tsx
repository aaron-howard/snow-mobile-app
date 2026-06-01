/**
 * Login screen tests.
 *
 * Strategy: mock everything below the screen — Clerk (so the SDK never
 * loads), Expo Router (so navigation is observable), and our own
 * `useAuthService` (so we can script the success/failure path). The
 * tests then drive the screen via React Native Testing Library and
 * assert on what the user would see.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Import AFTER mocks are registered.
import LoginScreen from '../../../app/(auth)/login';

// --- Mocks ------------------------------------------------------------

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({}),
  useSignIn: () => ({}),
  useSignUp: () => ({}),
  useUser: () => ({ isLoaded: false, user: null }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockSignIn = jest.fn();
const mockAuth = {
  isReady: true,
  signInWithEmail: mockSignIn,
  signUpWithEmail: jest.fn(),
  verifyEmailCode: jest.fn(),
  resendVerificationEmail: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  signOut: jest.fn(),
};
// Mock the whole auth barrel rather than requireActual it — the barrel
// re-exports `useUserSync`, which imports the WatermelonDB SQLite adapter
// and would try to initialize JSI inside Jest's Node environment.
jest.mock('../../domain/auth', () => ({
  useAuthService: () => mockAuth,
  useUserSync: () => undefined,
  validatePassword: (s: string) => s.length >= 8 && s.length <= 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSignIn.mockReset();
  });

  test('renders the heading and unofficial-status disclaimer', () => {
    const { getByRole, getByText } = render(<LoginScreen />);
    // Use the role to disambiguate — "Sign in" also appears as the button label.
    expect(getByRole('header', { name: 'Sign in' })).toBeTruthy();
    expect(getByText(/Not affiliated with ServiceNow/i)).toBeTruthy();
  });

  test('submit button is disabled until both email and password are filled', () => {
    const { getByLabelText, getByRole } = render(<LoginScreen />);
    const button = getByRole('button', { name: 'Sign in' });
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(getByLabelText('Email address'), 'user@example.com');
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(getByLabelText('Password'), 'password123');
    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  test('calls signInWithEmail with trimmed email and raw password', async () => {
    mockSignIn.mockResolvedValue({ ok: true, data: undefined });
    const { getByLabelText, getByRole } = render(<LoginScreen />);
    fireEvent.changeText(getByLabelText('Email address'), '  user@example.com  ');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123'),
    );
  });

  test('navigates to /(tabs) on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({ ok: true, data: undefined });
    const { getByLabelText, getByRole } = render(<LoginScreen />);
    fireEvent.changeText(getByLabelText('Email address'), 'user@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  test('renders an accessible alert with the error message on failed sign-in', async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' },
    });
    const { getByLabelText, getByRole, findByRole } = render(<LoginScreen />);
    fireEvent.changeText(getByLabelText('Email address'), 'user@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'wrong');
    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    const alert = await findByRole('alert');
    expect(alert.props.children).toBe('Email or password is incorrect.');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not double-submit while a request is already in flight', async () => {
    // Hold the promise open so the submit is "pending" for the duration.
    let resolveSignIn: (v: { ok: true; data: undefined }) => void = () => undefined;
    mockSignIn.mockReturnValueOnce(
      new Promise((res) => {
        resolveSignIn = res;
      }),
    );

    const { getByLabelText, getByRole } = render(<LoginScreen />);
    fireEvent.changeText(getByLabelText('Email address'), 'user@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    const button = getByRole('button', { name: 'Sign in' });

    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    resolveSignIn({ ok: true, data: undefined });
  });
});
