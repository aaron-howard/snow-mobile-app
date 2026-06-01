/**
 * Forgot-password screen tests — two-phase flow: request → confirm.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ForgotPasswordScreen from '../../../app/(auth)/forgot-password';

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

const mockRequest = jest.fn();
const mockConfirm = jest.fn();
const mockAuth = {
  isReady: true,
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  verifyEmailCode: jest.fn(),
  resendVerificationEmail: jest.fn(),
  requestPasswordReset: mockRequest,
  confirmPasswordReset: mockConfirm,
  signOut: jest.fn(),
};
jest.mock('../../domain/auth', () => ({
  useAuthService: () => mockAuth,
  useUserSync: () => undefined,
  validatePassword: (s: string) => s.length >= 8 && s.length <= 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockRequest.mockReset();
    mockConfirm.mockReset();
  });

  describe('request phase', () => {
    test('renders the reset-password heading', () => {
      const { getByRole } = render(<ForgotPasswordScreen />);
      expect(getByRole('header', { name: 'Reset password' })).toBeTruthy();
    });

    test('calls requestPasswordReset with trimmed email', async () => {
      mockRequest.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole } = render(<ForgotPasswordScreen />);
      fireEvent.changeText(getByLabelText('Email address'), '  user@example.com  ');
      fireEvent.press(getByRole('button', { name: 'Send reset code' }));
      await waitFor(() => expect(mockRequest).toHaveBeenCalledWith('user@example.com'));
    });

    test('transitions to the confirm phase after sending the code', async () => {
      mockRequest.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole, findByRole } = render(<ForgotPasswordScreen />);
      fireEvent.changeText(getByLabelText('Email address'), 'user@example.com');
      fireEvent.press(getByRole('button', { name: 'Send reset code' }));
      expect(await findByRole('header', { name: 'Enter code' })).toBeTruthy();
    });

    test('surfaces the error message when the request fails', async () => {
      mockRequest.mockResolvedValue({
        ok: false,
        error: { code: 'invalid_credentials', message: 'No account with that email.' },
      });
      const { getByLabelText, getByRole, findByRole } = render(<ForgotPasswordScreen />);
      fireEvent.changeText(getByLabelText('Email address'), 'unknown@example.com');
      fireEvent.press(getByRole('button', { name: 'Send reset code' }));
      const alert = await findByRole('alert');
      expect(alert.props.children).toMatch(/no account/i);
    });
  });

  describe('confirm phase', () => {
    const enterConfirmPhase = async () => {
      mockRequest.mockResolvedValue({ ok: true, data: undefined });
      const utils = render(<ForgotPasswordScreen />);
      fireEvent.changeText(utils.getByLabelText('Email address'), 'user@example.com');
      fireEvent.press(utils.getByRole('button', { name: 'Send reset code' }));
      await waitFor(() => utils.getByRole('header', { name: 'Enter code' }));
      return utils;
    };

    test('rejects short passwords client-side before calling Clerk', async () => {
      const { getByLabelText, getByRole, findByRole } = await enterConfirmPhase();
      fireEvent.changeText(getByLabelText('Verification code'), '123456');
      fireEvent.changeText(getByLabelText('New password'), 'short');
      fireEvent.press(getByRole('button', { name: 'Reset password' }));
      const alert = await findByRole('alert');
      expect(alert.props.children).toMatch(/between 8 and 128/i);
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    test('calls confirmPasswordReset with code and new password', async () => {
      mockConfirm.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole } = await enterConfirmPhase();
      fireEvent.changeText(getByLabelText('Verification code'), ' 123456 ');
      fireEvent.changeText(getByLabelText('New password'), 'longenough123');
      fireEvent.press(getByRole('button', { name: 'Reset password' }));
      await waitFor(() =>
        expect(mockConfirm).toHaveBeenCalledWith('123456', 'longenough123'),
      );
    });

    test('navigates to /(tabs) on a successful reset', async () => {
      mockConfirm.mockResolvedValue({ ok: true, data: undefined });
      const { getByLabelText, getByRole } = await enterConfirmPhase();
      fireEvent.changeText(getByLabelText('Verification code'), '123456');
      fireEvent.changeText(getByLabelText('New password'), 'longenough123');
      fireEvent.press(getByRole('button', { name: 'Reset password' }));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    });

    test('shows an error if the reset code is expired', async () => {
      mockConfirm.mockResolvedValue({
        ok: false,
        error: { code: 'reset_link_expired', message: 'Code expired. Request a new one.' },
      });
      const { getByLabelText, getByRole, findByRole } = await enterConfirmPhase();
      fireEvent.changeText(getByLabelText('Verification code'), '123456');
      fireEvent.changeText(getByLabelText('New password'), 'longenough123');
      fireEvent.press(getByRole('button', { name: 'Reset password' }));
      const alert = await findByRole('alert');
      expect(alert.props.children).toMatch(/expired/i);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
