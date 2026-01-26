import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
import {
	HELP_AUTH_ASSET_CONTROL_LINK,
	HELP_AUTH_CREATING_A_WALLET_LINK,
	HELP_AUTH_IMAGE_BANNER,
	HELP_AUTH_INTRODUCTION_LINK,
	HELP_AUTH_LOGGING_INTO_OISY_LINK,
	HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON,
	HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON
} from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AuthHelpForm', () => {
	const imageBannerSelector = `img[data-tid="${HELP_AUTH_IMAGE_BANNER}"]`;
	const newIdentityVersionButtonSelector = `button[data-tid="${HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON}"]`;
	const useIdentityNumberButtonSelector = `button[data-tid="${HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON}"]`;
	const introductionLinkSelector = `a[data-tid="${HELP_AUTH_INTRODUCTION_LINK}"]`;
	const loggingIntoOisyLinkSelector = `a[data-tid="${HELP_AUTH_LOGGING_INTO_OISY_LINK}"]`;
	const creatingAWalletLinkSelector = `a[data-tid="${HELP_AUTH_CREATING_A_WALLET_LINK}"]`;
	const assetControlLinkSelector = `a[data-tid="${HELP_AUTH_ASSET_CONTROL_LINK}"]`;

	it('should render auth help form content', () => {
		const { container, getByText } = render(AuthHelpForm, {
			props: {
				onOpenNewIdentityHelp: vi.fn()
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

		expect(getByText(get(i18n).auth.help.text.useful_links)).toBeInTheDocument();

		const introductionLink: HTMLAnchorElement | null =
			container.querySelector(introductionLinkSelector);

		expect(introductionLink).toBeInTheDocument();

		const loggingIngtoOisyLink: HTMLAnchorElement | null = container.querySelector(
			loggingIntoOisyLinkSelector
		);

		expect(loggingIngtoOisyLink).toBeInTheDocument();

		const creatingAWalletLink: HTMLAnchorElement | null = container.querySelector(
			creatingAWalletLinkSelector
		);

		expect(creatingAWalletLink).toBeInTheDocument();

		const assetControlLink: HTMLAnchorElement | null =
			container.querySelector(assetControlLinkSelector);

		expect(assetControlLink).toBeInTheDocument();

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.feedback_text))
		).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.thanks_text)).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
		const trackingEventKey = 'main_page_button';
		const onOpenNewIdentityHelpMock = vi.fn();
		const analyticSpy = vi.spyOn(analytics, 'trackEvent');

		const { container } = render(AuthHelpForm, {
			props: {
				onOpenNewIdentityHelp: onOpenNewIdentityHelpMock
			}
		});

		expect(onOpenNewIdentityHelpMock).not.toHaveBeenCalled();
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
	});
});
