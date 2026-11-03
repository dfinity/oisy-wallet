import * as onramperEnv from '$env/rest/onramper.env';
import * as backendApi from '$lib/api/backend.api';
import { OnramperSecretNotConfiguredError } from '$lib/canisters/errors';
import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
import {
	PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES,
	PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('BuyModalContent', () => {
	const mockSignature = 'a'.repeat(64);

	beforeEach(() => {
		mockAuthStore();
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockResolvedValue({
			signature: mockSignature,
			signed_query: ''
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the Onramper iframe when ONRAMPER_ENABLED is true', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);

		const { findByTestId } = render(BuyModalContent);

		// The iframe is rendered only after the async signing call resolves.
		await expect(findByTestId(BUY_MODAL_ONRAMPER_IFRAME)).resolves.toBeInTheDocument();
	});

	it('uses the centered overlay loader while the Onramper URL is pending', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockReturnValue(new Promise(() => {}));

		const { getByTestId, queryByTestId } = render(BuyModalContent);

		expect(getByTestId('spinner').closest('.overlay')).toBeInTheDocument();
		expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument();
	});

	it('renders the disabled unavailable notice when ONRAMPER_ENABLED is false', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => false);

		const { getByText, queryByText, queryByTestId } = render(BuyModalContent);

		expect(getByText(en.buy.text.unavailable_title)).toBeInTheDocument();
		expect(getByText(en.buy.text.unavailable_description_disabled)).toBeInTheDocument();
		expect(queryByText(en.buy.text.unavailable_description_signing_failed)).not.toBeInTheDocument();
		expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument();
	});

	it('renders the signing-failed unavailable notice when signing fails', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
			new OnramperSecretNotConfiguredError(
				'OnRamper signing secret is not configured on the backend canister.'
			)
		);

		const { findByText, queryByText, queryByTestId } = render(BuyModalContent);

		await expect(findByText(en.buy.text.unavailable_title)).resolves.toBeInTheDocument();
		await expect(
			findByText(en.buy.text.unavailable_description_signing_failed)
		).resolves.toBeInTheDocument();

		expect(queryByText(en.buy.text.unavailable_description_disabled)).not.toBeInTheDocument();

		await waitFor(() => expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument());
	});

	it('tracks onramper_open success once the signed URL resolves', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		const trackSpy = vi.spyOn(analyticsServices, 'trackOnramperOpen');

		const { findByTestId } = render(BuyModalContent);

		await expect(findByTestId(BUY_MODAL_ONRAMPER_IFRAME)).resolves.toBeInTheDocument();

		expect(trackSpy).toHaveBeenCalledWith(
			expect.objectContaining({ status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS })
		);
	});

	it('tracks onramper_open error with type and severity when signing fails', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		const trackSpy = vi.spyOn(analyticsServices, 'trackOnramperOpen');
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
			new OnramperSecretNotConfiguredError('boom')
		);

		const { findByText } = render(BuyModalContent);

		await expect(findByText(en.buy.text.unavailable_title)).resolves.toBeInTheDocument();

		await waitFor(() =>
			expect(trackSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					errorType: PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES.SECRET_NOT_CONFIGURED,
					errorMessage: 'boom'
				})
			)
		);
	});

	describe('focus taken by the widget', () => {
		let closeButton: HTMLButtonElement;

		beforeEach(() => {
			vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);

			// Stands in for the modal's close button, which holds the focus when the widget loads.
			closeButton = document.createElement('button');
			document.body.append(closeButton);
			closeButton.focus();
		});

		afterEach(() => {
			closeButton.remove();
			vi.useRealTimers();
		});

		// Focus moving into the iframe, by the widget itself or by the user, blurs OISY's window.
		const moveFocusIntoWidget = async (iframe: HTMLElement) => {
			iframe.focus();
			await fireEvent.blur(window);
		};

		const nextTask = () => new Promise((resolve) => setTimeout(resolve));

		it('hands the focus back once when the widget takes it right after loading', async () => {
			const { findByTestId } = render(BuyModalContent);
			const iframe = await findByTestId(BUY_MODAL_ONRAMPER_IFRAME);
			await fireEvent.load(iframe);

			await moveFocusIntoWidget(iframe);

			// To the page, not the close button, so keys meant for the widget can't press Close.
			await waitFor(() => expect(document.activeElement).toBe(document.body));

			await moveFocusIntoWidget(iframe);
			await nextTask();

			expect(document.activeElement).toBe(iframe);
		});

		it('leaves the focus in the widget when the user tabs into it', async () => {
			const { findByTestId } = render(BuyModalContent);
			const iframe = await findByTestId(BUY_MODAL_ONRAMPER_IFRAME);
			await fireEvent.load(iframe);

			await fireEvent.keyDown(window, { key: 'Tab' });
			await moveFocusIntoWidget(iframe);
			await nextTask();

			expect(document.activeElement).toBe(iframe);
		});

		it('leaves the focus in the widget when it moves there after the first seconds', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			const { findByTestId } = render(BuyModalContent);
			const iframe = await findByTestId(BUY_MODAL_ONRAMPER_IFRAME);
			await fireEvent.load(iframe);

			vi.setSystemTime(Date.now() + 5_001);
			await moveFocusIntoWidget(iframe);
			await nextTask();

			expect(document.activeElement).toBe(iframe);
		});
	});
});
