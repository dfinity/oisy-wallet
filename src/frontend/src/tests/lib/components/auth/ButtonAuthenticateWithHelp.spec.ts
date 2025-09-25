import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { modalStore } from '$lib/stores/modal.store';
import * as authWorker from '$lib/workers/auth.worker';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('ButtonAuthenticateWithHelp', () => {
	const signInButtonSelector = `button[data-tid="login-button"]`;
	const SigningInHelpLinkSpanSelector = `span[data-tid="${AUTH_SIGNING_IN_HELP_LINK}"]`;

	let checkAuthSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();

		checkAuthSpy = vi.spyOn(authWorker, 'checkAuthentication').mockResolvedValue(false);

		Object.defineProperty(window, 'location', {
			writable: true,
			value: {
				href: 'https://oisy.com',
				reload: vi.fn()
			}
		});
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

	it('should do nothing on successful sign in', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'ok' });

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledOnce();

		expect(get(modalStore)?.type).toBeUndefined();
	});

	it('should check whether an user is already authenticated before signin in', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'ok' });

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(checkAuthSpy).toHaveBeenCalledExactlyOnceWith();

		expect(authSpy).toHaveBeenCalledExactlyOnceWith({});

		expect(checkAuthSpy).toHaveBeenCalledBefore(authSpy);
	});

	it('should reload the page and not login if an user is already authenticated', async () => {
		checkAuthSpy.mockResolvedValueOnce(true);

		const reloadSpy = vi.spyOn(window.location, 'reload');

		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'ok' });

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(checkAuthSpy).toHaveBeenCalledExactlyOnceWith();

		expect(reloadSpy).toHaveBeenCalledExactlyOnceWith();

		expect(authSpy).not.toHaveBeenCalled();
	});
});
