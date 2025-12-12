import * as authEnv from '$env/auth.env';
import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { authLocked } from '$lib/stores/locked.store';
import { modalStore } from '$lib/stores/modal.store';
import { InternetIdentityDomain } from '$lib/types/auth';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ButtonAuthenticateWithHelp', () => {
	const signInButtonSelector = `button[data-tid="login-button"]`;
	const SigningInHelpLinkSpanSelector = `span[data-tid="${AUTH_SIGNING_IN_HELP_LINK}"]`;

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	it('should render sign in button', () => {
		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		const SigningInHelpLinkSpan: HTMLSpanElement | null = container.querySelector(
			SigningInHelpLinkSpanSelector
		);

		expect(SigningInHelpLinkSpan).toBeInTheDocument();
	});

	it('should open auth help modal on failed sign in', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledOnce();

		expect(get(modalStore)?.type).toBe('auth-help');
	});

	it('should call sign in with the correct domain if env var is 2.0', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });
		vi.spyOn(authEnv, 'PRIMARY_INTERNET_IDENTITY_VERSION', 'get').mockImplementation(() => '2.0');

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledExactlyOnceWith({ domain: InternetIdentityDomain.VERSION_2_0 });
	});

	it('should call sign in with the correct domain on the secondary button click if env var is 2.0', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });
		vi.spyOn(authEnv, 'PRIMARY_INTERNET_IDENTITY_VERSION', 'get').mockImplementation(() => '2.0');

		const { getByText } = render(ButtonAuthenticateWithHelp);

		const secondarySignInButton = getByText(
			en.auth.text.sign_in_with_identity_number
		) as HTMLButtonElement | null;

		expect(secondarySignInButton).toBeInTheDocument();

		await waitFor(() => secondarySignInButton?.click());

		expect(authSpy).toHaveBeenCalledExactlyOnceWith({ domain: InternetIdentityDomain.VERSION_1_0 });
	});

	it('should set the lock store to false on successful sign in', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'ok' });

		vi.spyOn(authLocked, 'unlock').mockImplementationOnce(vi.fn());

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledOnce();

		expect(get(modalStore)?.type).toBeUndefined();

		expect(authLocked.unlock).toHaveBeenCalledExactlyOnceWith({
			source: 'login from landing page'
		});
	});
});
