import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
import {
	TRACK_HELP_CONCERNED_ABOUT_SECURITY,
	TRACK_HELP_GOT_CONFUSED,
	TRACK_HELP_LOST_INTERNET_IDENTITY,
	TRACK_HELP_OTHER
} from '$lib/constants/analytics.contants';
import {
	HELP_AUTH_GOT_CONFUSED_BUTTON,
	HELP_AUTH_IMAGE_BANNER,
	HELP_AUTH_LOST_IDENTITY_BUTTON,
	HELP_AUTH_OTHER_BUTTON,
	HELP_AUTH_SECURITY_BUTTON
} from '$lib/constants/test-ids.constants';
import * as analytics from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AuthHelpForm', () => {
	const imageBannerSelector = `img[data-tid="${HELP_AUTH_IMAGE_BANNER}"]`;
	const lostIdentityButtonSelector = `button[data-tid="${HELP_AUTH_LOST_IDENTITY_BUTTON}"]`;
	const securityButtonSelector = `button[data-tid="${HELP_AUTH_SECURITY_BUTTON}"]`;
	const gotConfusedButtonSelector = `button[data-tid="${HELP_AUTH_GOT_CONFUSED_BUTTON}"]`;
	const otherButtonSelector = `button[data-tid="${HELP_AUTH_OTHER_BUTTON}"]`;

	it('should render auth help form content', () => {
		const { container, getByText } = render(AuthHelpForm, {
			props: {
				onLostIdentity: vi.fn(),
				onOther: vi.fn()
			}
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.subtitle)).toBeInTheDocument();

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

		const otherButton: HTMLButtonElement | null = container.querySelector(otherButtonSelector);

		expect(otherButton).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.other)).toBeInTheDocument();

		expect(getByText(get(i18n).auth.help.text.feedback_text)).toBeInTheDocument();
		expect(getByText(get(i18n).auth.help.text.thanks_text)).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
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

		const lostIdentityButton: HTMLButtonElement | null = container.querySelector(
			lostIdentityButtonSelector
		);

		expect(lostIdentityButton).toBeInTheDocument();

		await waitFor(() => {
			lostIdentityButton?.click();

			expect(onLostIdentityMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({ name: TRACK_HELP_LOST_INTERNET_IDENTITY });

		const securityButton: HTMLButtonElement | null =
			container.querySelector(securityButtonSelector);

		expect(securityButton).toBeInTheDocument();

		await waitFor(() => {
			securityButton?.click();

			expect(onOtherMock).toHaveBeenCalledOnce();
		});

		expect(analyticSpy).toHaveBeenCalledWith({ name: TRACK_HELP_CONCERNED_ABOUT_SECURITY });

		const gotConfusedButton: HTMLButtonElement | null =
			container.querySelector(gotConfusedButtonSelector);

		expect(gotConfusedButton).toBeInTheDocument();

		await waitFor(() => {
			gotConfusedButton?.click();

			expect(onOtherMock).toHaveBeenCalledTimes(2);
		});

		expect(analyticSpy).toHaveBeenCalledWith({ name: TRACK_HELP_GOT_CONFUSED });

		const otherButton: HTMLButtonElement | null = container.querySelector(otherButtonSelector);

		expect(otherButton).toBeInTheDocument();

		await waitFor(() => {
			otherButton?.click();

			expect(onOtherMock).toHaveBeenCalledTimes(3);
		});

		expect(analyticSpy).toHaveBeenCalledWith({ name: TRACK_HELP_OTHER });
	});
});
