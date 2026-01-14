import * as onRamperEnv from '$env/rest/onramper.env';
import BuyModal from '$lib/components/buy/BuyModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BuyModal', () => {
	it('renders correct title if isOnRamperDev is true', () => {
		const { getByText } = render(BuyModal);

		expect(getByText(en.buy.text.buy_dev)).toBeInTheDocument();
	});

	it('renders correct title if isOnRamperDev is false', () => {
		vi.spyOn(onRamperEnv, 'isOnRamperDev', 'get').mockImplementation(() => false);
		const { getByText } = render(BuyModal);

		expect(getByText(en.buy.text.buy)).toBeInTheDocument();
	});
});
