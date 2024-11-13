import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
import { formatUSD } from '$lib/utils/format.utils';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('ConvertAmountExchange', () => {
	const amount = 20.25;
	const exchangeRate = 0.01;

	const props = {
		amount,
		exchangeRate
	};

	const divSelector = 'div[data-tid="convert-amount-exchange"]';
	const skeletonSelector = 'div[data-tid="convert-amount-exchange-skeleton"]';

	it('should display value with tilde sign if amount is provided', () => {
		const { container, getByText } = render(ConvertAmountExchange, { props });

		const div: HTMLDivElement | null = container.querySelector(divSelector);
		assertNonNullish(div, 'Div not found');

		expect(
			getByText(
				`~${formatUSD({
					value: amount * exchangeRate
				})}`
			)
		).toBeInTheDocument();
	});

	it('should display value without tilde sign if amount is zero', () => {
		const { container, getByText } = render(ConvertAmountExchange, {
			props: { ...props, amount: 0 }
		});

		const div: HTMLDivElement | null = container.querySelector(divSelector);
		assertNonNullish(div, 'Div not found');

		expect(
			getByText(
				formatUSD({
					value: 0
				})
			)
		).toBeInTheDocument();
	});

	it('should display skeleton if amount is not provided', () => {
		const { amount: _, ...newProps } = props;
		const { container } = render(ConvertAmountExchange, { props: newProps });

		const skeleton: HTMLDivElement | null = container.querySelector(skeletonSelector);

		expect(skeleton).toBeInTheDocument();
	});

	it('should display skeleton if exchange rate is not provided', () => {
		const { exchangeRate: _, ...newProps } = props;
		const { container } = render(ConvertAmountExchange, { props: newProps });

		const skeleton: HTMLDivElement | null = container.querySelector(skeletonSelector);

		expect(skeleton).toBeInTheDocument();
	});
});
