import BuyModal from '$lib/components/buy/BuyModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BuyModal', () => {
	it('renders the buy title', () => {
		const { getByText } = render(BuyModal);

		expect(getByText(en.buy.text.buy)).toBeInTheDocument();
	});
});
