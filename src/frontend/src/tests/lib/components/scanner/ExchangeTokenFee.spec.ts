import ExchangeTokenToPay from '$lib/components/scanner/ExchangeTokenToPay.svelte';
import { formatCurrency } from '$lib/utils/format.utils';
import { render, screen } from '@testing-library/svelte';

vi.mock('$lib/utils/format.utils', () => ({
	formatCurrency: vi.fn()
}));

describe('ExchangeTokenToPay', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(formatCurrency).mockReturnValue('$15.50');
	});

	it('should render component', () => {
		const { container } = render(ExchangeTokenToPay, { props: { amountInUSD: 15.5 } });

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display formatted amount', () => {
		render(ExchangeTokenToPay, { props: { amountInUSD: 15.5 } });

		expect(screen.getByText('$15.50')).toBeInTheDocument();
	});

	it('should call formatCurrency with correct parameters', () => {
		render(ExchangeTokenToPay, { props: { amountInUSD: 15.5 } });

		expect(formatCurrency).toHaveBeenCalledWith({
			value: 15.5,
			currency: 'usd',
			exchangeRate: {
				currency: 'usd',
				exchangeRateToUsd: 1
			},
			language: 'en'
		});
	});

	it('should display zero amount', () => {
		vi.mocked(formatCurrency).mockReturnValue('$0.00');

		render(ExchangeTokenToPay, { props: { amountInUSD: 0 } });

		expect(screen.getByText('$0.00')).toBeInTheDocument();
	});

	it('should format different currencies', () => {
		vi.mocked(formatCurrency).mockReturnValue('€15,50');

		render(ExchangeTokenToPay, { props: { amountInUSD: 15.5 } });

		expect(screen.getByText('€15,50')).toBeInTheDocument();
	});

	it('should handle very small amounts', () => {
		vi.mocked(formatCurrency).mockReturnValue('$0.01');

		render(ExchangeTokenToPay, { props: { amountInUSD: 0.01 } });

		expect(screen.getByText('$0.01')).toBeInTheDocument();
	});

	it('should handle large amounts', () => {
		vi.mocked(formatCurrency).mockReturnValue('$999,999.99');

		render(ExchangeTokenToPay, { props: { amountInUSD: 999999.99 } });

		expect(screen.getByText('$999,999.99')).toBeInTheDocument();
	});

	it('should render output element', () => {
		const { container } = render(ExchangeTokenToPay, { props: { amountInUSD: 999999.99 } });

		expect(container.querySelector('output')).toBeInTheDocument();
	});

	it('should have break-all class', () => {
		const { container } = render(ExchangeTokenToPay, { props: { amountInUSD: 999999.99 } });

		const output = container.querySelector('output');

		expect(output).toHaveClass('break-all');
	});
});
