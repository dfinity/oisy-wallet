import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
import {
	HELP_AUTH_ASSET_CONTROL_LINK,
	HELP_AUTH_CREATING_A_WALLET_LINK,
	HELP_AUTH_IMAGE_BANNER,
	HELP_AUTH_INTRODUCTION_LINK,
	HELP_AUTH_ISSUE_WITH_LOGIN_PAGE_BUTTON,
	HELP_AUTH_LOGGING_INTO_OISY_LINK,
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
	const issueWithLoginPageButtonSelector = `button[data-tid="${HELP_AUTH_ISSUE_WITH_LOGIN_PAGE_BUTTON}"]`;
	const useIdentityNumberButtonSelector = `button[data-tid="${HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON}"]`;
	const introductionLinkSelector = `a[data-tid="${HELP_AUTH_INTRODUCTION_LINK}"]`;
	const assetControlLinkSelector = `a[data-tid="${HELP_AUTH_ASSET_CONTROL_LINK}"]`;
	const loggingIntoOisyLinkSelector = `a[data-tid="${HELP_AUTH_LOGGING_INTO_OISY_LINK}"]`;
	const createingAWalletLinkSelector = `a[data-tid="${HELP_AUTH_CREATING_A_WALLET_LINK}"]`;

	it('should render auth help form content', () => {
		const { container, getByText } = render(AuthHelpForm, {
			props: {
				onOpenNewIdentityHelp: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.description)).toBeInTheDocument();

		const issueWithLoginPageButton: HTMLButtonElement | null = container.querySelector(
			issueWithLoginPageButtonSelector
		);

		expect(issueWithLoginPageButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.issue_with_login_page)).toBeInTheDocument();

		const useIdentityNumberButton: HTMLButtonElement | null = container.querySelector(
			useIdentityNumberButtonSelector
		);

		expect(useIdentityNumberButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.use_identity_number)).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.useful_links)).toBeInTheDocument();

		const introductionLink: HTMLAnchorElement | null =
			container.querySelector(introductionLinkSelector);

		expect(introductionLink).toBeInTheDocument();

		const loggingIntoOisyLink: HTMLAnchorElement | null = container.querySelector(
			loggingIntoOisyLinkSelector
		);

		expect(loggingIntoOisyLink).toBeInTheDocument();

		const createingAWalletLink: HTMLAnchorElement | null = container.querySelector(
			createingAWalletLinkSelector
		);

		expect(createingAWalletLink).toBeInTheDocument();

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

		const issueWithLoginPageButton: HTMLButtonElement | null = container.querySelector(
			issueWithLoginPageButtonSelector
		);

		expect(issueWithLoginPageButton).toBeInTheDocument();

		await waitFor(() => {
			issueWithLoginPageButton?.click();

			expect(onOpenNewIdentityHelpMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'issue_with_login_page' }
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
