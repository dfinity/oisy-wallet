import AuthHelpNewIdentityForm from '$lib/components/auth/AuthHelpNewIdentityForm.svelte';
import {
	OISY_INTERNET_IDENTITY_HELP_CENTER_URL,
	OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL
} from '$lib/constants/oisy.constants';
import {
	HELP_AUTH_BACK_BUTTON,
	HELP_AUTH_DONE_BUTTON,
	HELP_AUTH_IDENTITY_IMAGE_BANNER,
	HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK,
	HELP_AUTH_LEGACY_SIGN_IN_BUTTON,
	HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK
} from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({
	signIn: vi.fn()
}));

describe('AuthHelpNewIdentityForm', () => {
	const imageBannerSelector = `img[data-tid="${HELP_AUTH_IDENTITY_IMAGE_BANNER}"]`;
	const legacySignInButtonSelector = `button[data-tid="${HELP_AUTH_LEGACY_SIGN_IN_BUTTON}"]`;
	const switchToNewInternetIdentityLinkSelector = `a[data-tid="${HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK}"]`;
	const internetIdentityHelpCenterLinkSelector = `a[data-tid="${HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK}"]`;
	const backButtonSelector = `button[data-tid="${HELP_AUTH_BACK_BUTTON}"]`;
	const doneButtonSelector = `button[data-tid="${HELP_AUTH_DONE_BUTTON}"]`;

	it('should render auth help new identity form content', () => {
		const { container, getByText } = render(AuthHelpNewIdentityForm, {
			props: {
				onBack: vi.fn(),
				onDone: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.identity_new_identity_title))
		).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.identity_new_identity_item_1)).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.identity_new_identity_item_2)).toBeInTheDocument();

		const legacySignInButton: HTMLButtonElement | null = container.querySelector(
			legacySignInButtonSelector
		);

		expect(legacySignInButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.identity_legacy_sign_in)).toBeInTheDocument();

		const switchToNewInternetIdentityLink: HTMLAnchorElement | null = container.querySelector(
			switchToNewInternetIdentityLinkSelector
		);

		expect(switchToNewInternetIdentityLink).toBeInTheDocument();
		expect(switchToNewInternetIdentityLink?.href).toBe(OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL);

		const internetIdentityHelpCenterLink: HTMLAnchorElement | null = container.querySelector(
			internetIdentityHelpCenterLinkSelector
		);

		expect(internetIdentityHelpCenterLink).toBeInTheDocument();
		expect(internetIdentityHelpCenterLink?.href).toBe(OISY_INTERNET_IDENTITY_HELP_CENTER_URL);

		const backButton: HTMLButtonElement | null = container.querySelector(backButtonSelector);

		expect(backButton).toBeInTheDocument();

		const doneButton: HTMLButtonElement | null = container.querySelector(doneButtonSelector);

		expect(doneButton).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
		const onBackMock = vi.fn();
		const onDoneMock = vi.fn();
		const authSpy = vi.spyOn(auth, 'signIn');

		const { container } = render(AuthHelpNewIdentityForm, {
			props: {
				onBack: onBackMock,
				onDone: onDoneMock
			}
		});

		expect(onBackMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(authSpy).not.toHaveBeenCalled();

		const backButton: HTMLButtonElement | null = container.querySelector(backButtonSelector);

		expect(backButton).toBeInTheDocument();

		await waitFor(() => {
			backButton?.click();

			expect(onBackMock).toHaveBeenCalledOnce();
		});

		const doneButton: HTMLButtonElement | null = container.querySelector(doneButtonSelector);

		expect(doneButton).toBeInTheDocument();

		await waitFor(() => {
			doneButton?.click();

			expect(onDoneMock).toHaveBeenCalledOnce();
		});

		const legacySignInButton: HTMLButtonElement | null = container.querySelector(
			legacySignInButtonSelector
		);

		expect(legacySignInButton).toBeInTheDocument();

		await waitFor(() => {
			legacySignInButton?.click();
		});

		expect(onDoneMock).toHaveBeenCalledTimes(2);
		expect(authSpy).toHaveBeenCalledWith({ domain: 'beta.identity.internetcomputer.org' });
	});
});
