import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { modalStore } from '$lib/stores/modal.store';
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

	it('should do nothing on successful sign in', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'ok' });

		const { container } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => signInButton?.click());

		expect(authSpy).toHaveBeenCalledOnce();

		expect(get(modalStore)?.type).toBeUndefined();
	});
});
