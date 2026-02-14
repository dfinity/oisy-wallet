import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { authLocked } from '$lib/stores/locked.store';
import { modalStore } from '$lib/stores/modal.store';
import { InternetIdentityDomain } from '$lib/types/auth';
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

	it('should call sign in with the correct domain', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledExactlyOnceWith({
			domain: InternetIdentityDomain.VERSION_2_0,
			asPopup: false
		});
	});

	it('should call sign in as pop-up', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });

		const { container } = render(ButtonAuthenticateWithHelp, {
			props: {
				asPopup: true
			}
		});

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledExactlyOnceWith({
			domain: InternetIdentityDomain.VERSION_2_0,
			asPopup: true
		});
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
