import * as onramperEnv from '$env/rest/onramper.env';
import * as backendApi from '$lib/api/backend.api';
import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render } from '@testing-library/svelte';

describe('BuyModalContent', () => {
	const mockSignature = 'a'.repeat(64);

	beforeEach(() => {
		mockAuthStore();
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockResolvedValue(mockSignature);
		vi.spyOn(backendApi, 'onramperEnabled').mockResolvedValue(true);
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
});
