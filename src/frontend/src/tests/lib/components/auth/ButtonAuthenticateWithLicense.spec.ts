import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
import { AUTH_LICENSE_LINK, AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ButtonAuthenticateWithLicense', () => {
	const signInButtonSelector = `button[data-tid="login-button"]`;
	const licenseLinkAnchorSelector = `a[data-tid="${AUTH_LICENSE_LINK}"]`;
	const SigningInHelpLinkSpanSelector = `span[data-tid="${AUTH_SIGNING_IN_HELP_LINK}"]`;

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	it('should render button authenticate with license content', () => {
		const { container, getByText } = render(ButtonAuthenticateWithHelp);

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		expect(getByText(get(i18n).license_agreement.text.accept_terms)).toBeInTheDocument();

		const licenseLinkAnchor: HTMLAnchorElement | null =
			container.querySelector(licenseLinkAnchorSelector);

		expect(licenseLinkAnchor).toBeInTheDocument();

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
