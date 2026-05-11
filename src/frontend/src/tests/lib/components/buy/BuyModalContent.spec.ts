import * as onramperEnv from '$env/rest/onramper.env';
import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BuyModalContent', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the Onramper iframe when ONRAMPER_ENABLED is true', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);

		const { getByTestId } = render(BuyModalContent);

		expect(getByTestId(BUY_MODAL_ONRAMPER_IFRAME)).toBeInTheDocument();
	});

	it('renders the unavailable notice when ONRAMPER_ENABLED is false', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => false);

		const { getByText, queryByTestId } = render(BuyModalContent);

		expect(getByText(en.buy.text.unavailable_title)).toBeInTheDocument();
		expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument();
	});
});
