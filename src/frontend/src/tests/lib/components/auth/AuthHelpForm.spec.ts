import * as authEnv from '$env/auth.env';
import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
import {
	HELP_AUTH_IMAGE_BANNER,
	HELP_AUTH_LOST_IDENTITY_BUTTON,
	HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON,
	HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON,
	HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK,
	HELP_AUTH_INTRODUCTION_LINK,
	HELP_AUTH_PRIVATE_KEY_LINK,
	HELP_AUTH_ASSET_CONTROL_LINK,
	HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK
} from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.spyOn(authEnv, 'PRIMARY_INTERNET_IDENTITY_VERSION', 'get').mockImplementation(() => '2.0');

describe('AuthHelpForm', () => {
	const imageBannerSelector = `img[data-tid="${HELP_AUTH_IMAGE_BANNER}"]`;
	const lostIdentityButtonSelector = `button[data-tid="${HELP_AUTH_LOST_IDENTITY_BUTTON}"]`;
	const newIdentityVersionButtonSelector = `button[data-tid="${HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON}"]`;
	const useIdentityNumberButtonSelector = `button[data-tid="${HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON}"]`;
	const switchToNewInternetIdentityLinkSelector = `a[data-tid="${HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK}"]`;
	const introductionLinkSelector = `a[data-tid="${HELP_AUTH_INTRODUCTION_LINK}"]`;
	const privateKeyLinkSelector = `a[data-tid="${HELP_AUTH_PRIVATE_KEY_LINK}"]`;
	const assetControlLinkSelector = `a[data-tid="${HELP_AUTH_ASSET_CONTROL_LINK}"]`;
	const internetIdentityHelpCenterLinkSelector = `a[data-tid="${HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK}"]`;

	it('should render auth help form content', () => {
		const { container, getByText } = render(AuthHelpForm, {
			props: {
				onOpenNewIdentityHelp: vi.fn(),
				onOpenLegacyIdentityHelp: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.description)).toBeInTheDocument();

		const newIdentityVersionButton: HTMLButtonElement | null = container.querySelector(
			newIdentityVersionButtonSelector
		);

		expect(newIdentityVersionButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.login_page_looks_different)).toBeInTheDocument();

		const useIdentityNumberButton: HTMLButtonElement | null = container.querySelector(
			useIdentityNumberButtonSelector
		);

		expect(useIdentityNumberButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.use_identity_number)).toBeInTheDocument();

		const lostIdentityButton: HTMLButtonElement | null = container.querySelector(
			lostIdentityButtonSelector
		);

		expect(lostIdentityButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.lost_identity_number)).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.useful_links)).toBeInTheDocument();

		const switchToNewInternetIdentityLink: HTMLAnchorElement | null = container.querySelector(
			switchToNewInternetIdentityLinkSelector
		);

		expect(switchToNewInternetIdentityLink).toBeInTheDocument();

		const introductionLink: HTMLAnchorElement | null = container.querySelector(
			introductionLinkSelector
		);

		expect(introductionLink).toBeInTheDocument();

		const privateKeyLink: HTMLAnchorElement | null =
			container.querySelector(privateKeyLinkSelector);

		expect(privateKeyLink).toBeInTheDocument();

		const assetControlLink: HTMLAnchorElement | null =
			container.querySelector(assetControlLinkSelector);

		expect(assetControlLink).toBeInTheDocument();

		const internetIdentityHelpCenterLink: HTMLAnchorElement | null = container.querySelector(
			internetIdentityHelpCenterLinkSelector
		);

		expect(internetIdentityHelpCenterLink).toBeInTheDocument();

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.feedback_text))
		).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.thanks_text)).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
		const trackingEventKey = 'main_page_button';
		const onOpenNewIdentityHelpMock = vi.fn();
		const onOpenLegacyIdentityHelpMock = vi.fn();
		const analyticSpy = vi.spyOn(analytics, 'trackEvent');

		const { container } = render(AuthHelpForm, {
			props: {
				onOpenNewIdentityHelp: onOpenNewIdentityHelpMock,
				onOpenLegacyIdentityHelp: onOpenLegacyIdentityHelpMock
			}
		});

		expect(onOpenNewIdentityHelpMock).not.toHaveBeenCalled();
		expect(onOpenLegacyIdentityHelpMock).not.toHaveBeenCalled();
		expect(analyticSpy).not.toHaveBeenCalled();

		const newIdentityVersionButton: HTMLButtonElement | null = container.querySelector(
			newIdentityVersionButtonSelector
		);

		expect(newIdentityVersionButton).toBeInTheDocument();

		await waitFor(() => {
			newIdentityVersionButton?.click();

			expect(onOpenNewIdentityHelpMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'login_page_looks_different' }
		});

		const useIdentityNumberButton: HTMLButtonElement | null = container.querySelector(
			useIdentityNumberButtonSelector
		);

		expect(useIdentityNumberButton).toBeInTheDocument();

		await waitFor(() => {
			useIdentityNumberButton?.click();

			expect(onOpenNewIdentityHelpMock).toHaveBeenCalledTimes(2);
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'use_identity_number' }
		});

		const lostIdentityButton: HTMLButtonElement | null = container.querySelector(
			lostIdentityButtonSelector
		);

		expect(lostIdentityButton).toBeInTheDocument();

		await waitFor(() => {
			lostIdentityButton?.click();

			expect(onOpenLegacyIdentityHelpMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'lost_identity_number' }
		});
	});
});
