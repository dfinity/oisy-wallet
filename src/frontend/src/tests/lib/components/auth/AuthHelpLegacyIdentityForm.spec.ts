import AuthHelpLegacyIdentityForm from '$lib/components/auth/AuthHelpLegacyIdentityForm.svelte';
import { OISY_FIND_INTERNET_IDENTITY_URL } from '$lib/constants/oisy.constants';
import {
	HELP_AUTH_BACK_BUTTON,
	HELP_AUTH_DONE_BUTTON,
	HELP_AUTH_IDENTITY_IMAGE_BANNER,
	HELP_AUTH_LEARN_MORE_LINK
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AuthHelpLegacyIdentityForm', () => {
	const imageBannerSelector = `img[data-tid="${HELP_AUTH_IDENTITY_IMAGE_BANNER}"]`;
	const learnMoreAnchorSelector = `a[data-tid="${HELP_AUTH_LEARN_MORE_LINK}"]`;
	const backButtonSelector = `button[data-tid="${HELP_AUTH_BACK_BUTTON}"]`;
	const doneButtonSelector = `button[data-tid="${HELP_AUTH_DONE_BUTTON}"]`;

	it('should render auth help legacy identity form content', () => {
		const { container, getByText } = render(AuthHelpLegacyIdentityForm, {
			props: {
				onBack: vi.fn(),
				onDone: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.identity_legacy_identity_title)).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.identity_legacy_identity_item_2)).toBeInTheDocument();

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

		const { container } = render(AuthHelpLegacyIdentityForm, {
			props: {
				onBack: onBackMock,
				onDone: onDoneMock
			}
		});

		expect(onBackMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();

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
	});
});
