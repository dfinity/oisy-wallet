import SwapGaslessFee from '$lib/components/swap/SwapGaslessFee.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('GaslessFeeDisplay', () => {
	it('renders gasless text', () => {
		const { container } = render(SwapGaslessFee);

		expect(container).toHaveTextContent(en.swap.text.gasless);
	});

	it('renders fee label', () => {
		const { container } = render(SwapGaslessFee);

		expect(container).toHaveTextContent(en.fee.text.total_fee);
	});

	it('renders zero currency value', () => {
		const { container } = render(SwapGaslessFee);

		expect(container).toHaveTextContent('$0.00');
	});

	it('shows zero value with exchange rate', () => {
		const { container } = render(SwapGaslessFee);

		expect(container).toHaveTextContent('$0.00');
	});
});
