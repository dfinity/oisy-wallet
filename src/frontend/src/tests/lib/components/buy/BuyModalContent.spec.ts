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
import { render, waitFor } from '@testing-library/svelte';

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
});
