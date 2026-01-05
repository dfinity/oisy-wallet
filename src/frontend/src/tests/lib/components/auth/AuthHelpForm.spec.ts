import * as authEnv from '$env/auth.env';
import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
import {
	HELP_AUTH_COULD_NOT_ENTER_IDENTITY_NUMBER_BUTTON,
	HELP_AUTH_GOT_CONFUSED_BUTTON,
	HELP_AUTH_IMAGE_BANNER,
	HELP_AUTH_LOST_IDENTITY_BUTTON,
	HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON,
	HELP_AUTH_NO_SIGN_UP_NEEDED_BUTTON,
	HELP_AUTH_OTHER_BUTTON,
	HELP_AUTH_SECURITY_BUTTON
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
	const securityButtonSelector = `button[data-tid="${HELP_AUTH_SECURITY_BUTTON}"]`;
	const gotConfusedButtonSelector = `button[data-tid="${HELP_AUTH_GOT_CONFUSED_BUTTON}"]`;
	const otherButtonSelector = `button[data-tid="${HELP_AUTH_OTHER_BUTTON}"]`;
	const newIdentityVersionButtonSelector = `button[data-tid="${HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON}"]`;
	const noSignUpNeededButtonSelector = `button[data-tid="${HELP_AUTH_NO_SIGN_UP_NEEDED_BUTTON}"]`;
	const couldNotEnterIdentityNumberButtonSelector = `button[data-tid="${HELP_AUTH_COULD_NOT_ENTER_IDENTITY_NUMBER_BUTTON}"]`;

	it('should render auth help form content', () => {
		const { container, getByText } = render(AuthHelpForm, {
			props: {
				onLostIdentity: vi.fn(),
				onOther: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		const newIdentityVersionButton: HTMLButtonElement | null = container.querySelector(
			newIdentityVersionButtonSelector
		);

		expect(newIdentityVersionButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.new_auth_version)).toBeInTheDocument();

		const couldNotEnterIdentityNumberButton: HTMLButtonElement | null = container.querySelector(
			couldNotEnterIdentityNumberButtonSelector
		);

		expect(couldNotEnterIdentityNumberButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.could_not_enter_identity_number)).toBeInTheDocument();

		const lostIdentityButton: HTMLButtonElement | null = container.querySelector(
			lostIdentityButtonSelector
		);

		expect(lostIdentityButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.lost_identity)).toBeInTheDocument();

		const securityButton: HTMLButtonElement | null =
			container.querySelector(securityButtonSelector);

		expect(securityButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.security)).toBeInTheDocument();

		const gotConfusedButton: HTMLButtonElement | null =
			container.querySelector(gotConfusedButtonSelector);

		expect(gotConfusedButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.got_confused)).toBeInTheDocument();

		const noSignUpNeededButton: HTMLButtonElement | null = container.querySelector(
			noSignUpNeededButtonSelector
		);

		expect(noSignUpNeededButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.no_signup_needed)).toBeInTheDocument();

		const otherButton: HTMLButtonElement | null = container.querySelector(otherButtonSelector);

		expect(otherButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.other)).toBeInTheDocument();

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.feedback_text))
		).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.thanks_text)).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
		const trackingEventKey = 'main_page_button';
		const onLostIdentityMock = vi.fn();
		const onOtherMock = vi.fn();
		const analyticSpy = vi.spyOn(analytics, 'trackEvent');

		const { container } = render(AuthHelpForm, {
			props: {
				onLostIdentity: onLostIdentityMock,
				onOther: onOtherMock
			}
		});

		expect(onLostIdentityMock).not.toHaveBeenCalled();
		expect(onOtherMock).not.toHaveBeenCalled();
		expect(analyticSpy).not.toHaveBeenCalled();

		const newIdentityVersionButton: HTMLButtonElement | null = container.querySelector(
			newIdentityVersionButtonSelector
		);

		expect(newIdentityVersionButton).toBeInTheDocument();

		await waitFor(() => {
			newIdentityVersionButton?.click();

			expect(onLostIdentityMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'new_auth_version' }
		});

		const couldNotEnterIdentityNumberButton: HTMLButtonElement | null = container.querySelector(
			couldNotEnterIdentityNumberButtonSelector
		);

		expect(couldNotEnterIdentityNumberButton).toBeInTheDocument();

		await waitFor(() => {
			couldNotEnterIdentityNumberButton?.click();

			expect(onLostIdentityMock).toHaveBeenCalledTimes(2);
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'could_not_enter_identity_number' }
		});

		const lostIdentityButton: HTMLButtonElement | null = container.querySelector(
			lostIdentityButtonSelector
		);

		expect(lostIdentityButton).toBeInTheDocument();

		await waitFor(() => {
			lostIdentityButton?.click();

			expect(onLostIdentityMock).toHaveBeenCalledTimes(3);
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'lost_identity' }
		});

		const securityButton: HTMLButtonElement | null =
			container.querySelector(securityButtonSelector);

		expect(securityButton).toBeInTheDocument();

		await waitFor(() => {
			securityButton?.click();

			expect(onOtherMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'security' }
		});

		const gotConfusedButton: HTMLButtonElement | null =
			container.querySelector(gotConfusedButtonSelector);

		expect(gotConfusedButton).toBeInTheDocument();

		await waitFor(() => {
			gotConfusedButton?.click();

			expect(onOtherMock).toHaveBeenCalledTimes(2);
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'got_confused' }
		});

		const noSignUpNeededButton: HTMLButtonElement | null = container.querySelector(
			noSignUpNeededButtonSelector
		);

		expect(noSignUpNeededButton).toBeInTheDocument();

		await waitFor(() => {
			noSignUpNeededButton?.click();

			expect(onLostIdentityMock).toHaveBeenCalledTimes(4);
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'no_signup_needed' }
		});

		const otherButton: HTMLButtonElement | null = container.querySelector(otherButtonSelector);

		expect(otherButton).toBeInTheDocument();

		await waitFor(() => {
			otherButton?.click();

			expect(onOtherMock).toHaveBeenCalledTimes(3);
		});

		expect(analyticSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_key: trackingEventKey, event_value: 'other' }
		});
	});
});
