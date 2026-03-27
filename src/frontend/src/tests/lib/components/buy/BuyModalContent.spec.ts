import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('BuyModalContent', () => {
	it('renders correct title if isOnRamperDev is true', () => {
		const { getByTestId } = render(BuyModalContent);

		expect(getByTestId(BUY_MODAL_ONRAMPER_IFRAME)).toBeInTheDocument();
	});
});
