/**
 * Register screen tests — two-phase flow: collect → verify.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import RegisterScreen from '../../../app/(auth)/register';

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

const mockSignUp = jest.fn();
const mockVerify = jest.fn();
const mockResend = jest.fn();
const mockAuth = {
  isReady: true,
  signInWithEmail: jest.fn(),
  signUpWithEmail: mockSignUp,
  verifyEmailCode: mockVerify,
  resendVerificationEmail: mockResend,
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  signOut: jest.fn(),
};
jest.mock('../../domain/auth', () => ({
  useAuthService: () => mockAuth,
  useUserSync: () => undefined,
  validatePassword: (s: string) => s.length >= 8 && s.length <= 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSignUp.mockReset();
    mockVerify.mockReset();
    mockResend.mockReset();
  });

  describe('collect phase', () => {
    test('renders the create-account heading', () => {
      const { getByRole } = render(<RegisterScreen />);
      expect(getByRole('header', { name: 'Create account' })).toBeTruthy();
    });

    test('rejects passwords shorter than 8 characters before calling Clerk', async () => {
      const { getByLabelText, getByRole, findByRole } = render(<RegisterScreen />);
      fireEvent.changeText(getByLabelText('Email address'), 'user@example.com');
      fireEvent.changeText(getByLabelText('Password'), 'short');
      fireEvent.press(getByRole('button', { name: 'Create account' }));
      const alert = await findByRole('alert');
      expect(alert.props.children).toMatch(/between 8 and 128/i);
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    test('calls signUpWithEmail on submit with valid input', async () => {
      mockSignUp.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole } = render(<RegisterScreen />);
      fireEvent.changeText(getByLabelText('Email address'), '  new@example.com ');
      fireEvent.changeText(getByLabelText('Password'), 'longenough123');
      fireEvent.press(getByRole('button', { name: 'Create account' }));
      await waitFor(() =>
        expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'longenough123'),
      );
    });

    test('surfaces email-in-use error from Clerk', async () => {
      mockSignUp.mockResolvedValue({
        ok: false,
        error: { code: 'email_in_use', message: 'An account with this email already exists.' },
      });
      const { getByLabelText, getByRole, findByRole } = render(<RegisterScreen />);
      fireEvent.changeText(getByLabelText('Email address'), 'taken@example.com');
      fireEvent.changeText(getByLabelText('Password'), 'longenough123');
      fireEvent.press(getByRole('button', { name: 'Create account' }));
      const alert = await findByRole('alert');
      expect(alert.props.children).toMatch(/already exists/i);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('transitions to the verify phase after successful sign-up', async () => {
      mockSignUp.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole, findByRole } = render(<RegisterScreen />);
      fireEvent.changeText(getByLabelText('Email address'), 'new@example.com');
      fireEvent.changeText(getByLabelText('Password'), 'longenough123');
      fireEvent.press(getByRole('button', { name: 'Create account' }));
      // The heading flips to "Verify your email" once we're in the second phase.
      expect(await findByRole('header', { name: 'Verify your email' })).toBeTruthy();
    });
  });

  describe('verify phase', () => {
    const enterVerifyPhase = async () => {
      mockSignUp.mockResolvedValue({ ok: true, data: undefined });
      const utils = render(<RegisterScreen />);
      fireEvent.changeText(utils.getByLabelText('Email address'), 'new@example.com');
      fireEvent.changeText(utils.getByLabelText('Password'), 'longenough123');
      fireEvent.press(utils.getByRole('button', { name: 'Create account' }));
      await waitFor(() => utils.getByRole('header', { name: 'Verify your email' }));
      return utils;
    };

    test('calls verifyEmailCode and navigates to /(tabs) on success', async () => {
      mockVerify.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole } = await enterVerifyPhase();
      fireEvent.changeText(getByLabelText('Verification code'), '123456');
      fireEvent.press(getByRole('button', { name: 'Verify code' }));
      await waitFor(() => expect(mockVerify).toHaveBeenCalledWith('123456'));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    });

    test('shows the error message when the code is invalid', async () => {
      mockVerify.mockResolvedValue({
        ok: false,
        error: { code: 'verification_code_invalid', message: 'That code is incorrect.' },
      });
      const { getByLabelText, getByRole, findByRole } = await enterVerifyPhase();
      fireEvent.changeText(getByLabelText('Verification code'), '000000');
      fireEvent.press(getByRole('button', { name: 'Verify code' }));
      const alert = await findByRole('alert');
      expect(alert.props.children).toMatch(/incorrect/i);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('resend button triggers resendVerificationEmail', async () => {
      mockResend.mockResolvedValue({ ok: true, data: undefined });
      const { getByRole } = await enterVerifyPhase();
      fireEvent.press(getByRole('button', { name: 'Resend verification email' }));
      await waitFor(() => expect(mockResend).toHaveBeenCalled());
    });
  });
});
