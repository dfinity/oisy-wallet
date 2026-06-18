import * as onramperEnv from '$env/rest/onramper.env';
import * as backendApi from '$lib/api/backend.api';
import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('BuyModalContent', () => {
	const mockSignature = 'a'.repeat(64);

	beforeEach(() => {
		mockAuthStore();
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockResolvedValue(mockSignature);
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

	it('renders the unavailable notice when ONRAMPER_ENABLED is false', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => false);

		const { getByText, queryByTestId } = render(BuyModalContent);

		expect(getByText(en.buy.text.unavailable_title)).toBeInTheDocument();
		expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument();
	});

	it('renders the unavailable notice when ONRAMPER_ENABLED is true but signing fails', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
			new Error('OnRamper signing secret is not configured on the backend canister.')
		);

		const { findByText, queryByTestId } = render(BuyModalContent);

		await expect(findByText(en.buy.text.unavailable_title)).resolves.toBeInTheDocument();

		await waitFor(() => expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument());
	});
});
