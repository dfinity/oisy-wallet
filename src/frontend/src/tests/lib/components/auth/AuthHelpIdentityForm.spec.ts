import AuthHelpIdentityForm from '$lib/components/auth/AuthHelpIdentityForm.svelte';
import { OISY_FIND_INTERNET_IDENTITY_URL } from '$lib/constants/oisy.constants';
import {
	HELP_AUTH_BACK_BUTTON,
	HELP_AUTH_DONE_BUTTON,
	HELP_AUTH_IDENTITY_IMAGE_BANNER,
	HELP_AUTH_LEARN_MORE_LINK,
	HELP_AUTH_LEGACY_SIGN_IN_BUTTON
} from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({
	signIn: vi.fn(),
	nullishSignOut: vi.fn()
}));

describe('AuthHelpIdentityForm', () => {
	const imageBannerSelector = `img[data-tid="${HELP_AUTH_IDENTITY_IMAGE_BANNER}"]`;
	const signInButtonSelector = `button[data-tid="${HELP_AUTH_LEGACY_SIGN_IN_BUTTON}"]`;
	const learnMoreAnchorSelector = `a[data-tid="${HELP_AUTH_LEARN_MORE_LINK}"]`;
	const backButtonSelector = `button[data-tid="${HELP_AUTH_BACK_BUTTON}"]`;
	const doneButtonSelector = `button[data-tid="${HELP_AUTH_DONE_BUTTON}"]`;

	it('should render auth help identity form content', () => {
		const { container, getByText } = render(AuthHelpIdentityForm, {
			props: {
				onBack: vi.fn(),
				onDone: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.identity_legacy_description)).toBeInTheDocument();

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.identity_legacy_sign_in)).toBeInTheDocument();

		const learnMoreAnchor: HTMLAnchorElement | null =
			container.querySelector(learnMoreAnchorSelector);

		expect(learnMoreAnchor).toBeInTheDocument();
		expect(learnMoreAnchor?.href).toBe(OISY_FIND_INTERNET_IDENTITY_URL);
		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.identity_learn_more))
		).toBeInTheDocument();

		const backButton: HTMLButtonElement | null = container.querySelector(backButtonSelector);

		expect(backButton).toBeInTheDocument();

		const doneButton: HTMLButtonElement | null = container.querySelector(doneButtonSelector);

		expect(doneButton).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
		const onBackMock = vi.fn();
		const onDoneMock = vi.fn();
		const authSpy = vi.spyOn(auth, 'signIn');

		const { container } = render(AuthHelpIdentityForm, {
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

		const signInButton: HTMLButtonElement | null = container.querySelector(signInButtonSelector);

		expect(signInButton).toBeInTheDocument();

		await waitFor(() => {
			signInButton?.click();
		});

		expect(onDoneMock).toHaveBeenCalledTimes(2);
		expect(authSpy).toHaveBeenCalledWith({ domain: 'ic0.app' });
	});
});
