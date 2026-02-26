import OpenCryptoPayTokenAmount from '$lib/components/open-crypto-pay/OpenCryptoPayTokenAmount.svelte';
import * as formatUtils from '$lib/utils/format.utils';
import { render, screen } from '@testing-library/svelte';

describe('OpenCryptoPayTokenAmount', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(() => `$100.00`);
	});

	it('should render component', () => {
		const { container } = render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display formatted amount', () => {
		render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

		expect(screen.getByText('$100.00')).toBeInTheDocument();
	});

	it('should call formatCurrency with correct parameters', () => {
		render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

		expect(formatUtils.formatCurrency).toHaveBeenCalledWith({
			value: 100,
			currency: 'usd',
			exchangeRate: {
				currency: 'usd',
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: null
			},
			language: 'en'
		});
	});

	it('should render output element', () => {
		const { container } = render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

		expect(container.querySelector('output')).toBeInTheDocument();
	});

	it('should have correct CSS classes', () => {
		const { container } = render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

		const output = container.querySelector('output');

		expect(output).toHaveClass('flex', 'items-center', 'justify-end', 'gap-2', 'break-all');
	});

	describe('best rate badge', () => {
		it('should not show badge when isBestRate is undefined', () => {
			const { container } = render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

			const output = container.querySelector('output');

			expect(output?.children.length).toBe(0);
		});

		it('should not show badge when isBestRate is false', () => {
			const { container } = render(OpenCryptoPayTokenAmount, {
				props: { amountInUSD: 100, isBestRate: false }
			});

			const output = container.querySelector('output');

			expect(output?.children.length).toBe(0);
		});

		it('should show badge when isBestRate is true', () => {
			const { container } = render(OpenCryptoPayTokenAmount, {
				props: { amountInUSD: 100, isBestRate: true }
			});

			const output = container.querySelector('output');

			expect(output?.children.length).toBeGreaterThan(0);
		});
	});

	describe('different amounts', () => {
		it('should handle zero amount', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('$0.00');

			render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 0 } });

			expect(screen.getByText('$0.00')).toBeInTheDocument();
		});

		it('should handle small amounts', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('$0.01');

			render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 0.01 } });

			expect(screen.getByText('$0.01')).toBeInTheDocument();
		});

		it('should handle large amounts', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('$999,999.99');

			render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 999999.99 } });

			expect(screen.getByText('$999,999.99')).toBeInTheDocument();
		});

		it('should handle decimal amounts', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('$123.45');

			render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 123.45 } });

			expect(screen.getByText('$123.45')).toBeInTheDocument();
		});
	});

	describe('different currencies', () => {
		it('should format with EUR', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('€100,00');

			render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

			expect(screen.getByText('€100,00')).toBeInTheDocument();
		});

		it('should format with CHF', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('CHF 100.00');

			render(OpenCryptoPayTokenAmount, { props: { amountInUSD: 100 } });

			expect(screen.getByText('CHF 100.00')).toBeInTheDocument();
		});
	});
});
