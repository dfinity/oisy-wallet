import TokenFeeValue from '$lib/components/tokens/TokenFeeValue.svelte';
import * as formatUtils from '$lib/utils/format.utils';
import { render, screen } from '@testing-library/svelte';

describe('TokenFeeValue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(() => `$15.50`);
	});

	it('should render component', () => {
		const { container } = render(TokenFeeValue, { props: { feeInUSD: 15.5 } });

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display formatted amount', () => {
		render(TokenFeeValue, { props: { feeInUSD: 15.5 } });

		expect(screen.getByText('Fee ~$15.50')).toBeInTheDocument();
	});

	it('should call formatCurrency with correct parameters', () => {
		render(TokenFeeValue, { props: { feeInUSD: 15.5 } });

		expect(formatUtils.formatCurrency).toHaveBeenCalledWith({
			value: 15.5,
			currency: 'usd',
			exchangeRate: {
				currency: 'usd',
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: null
			},
			language: 'en',
			notBelowThreshold: true
		});
	});

	it('should display zero amount', () => {
		vi.mocked(formatUtils.formatCurrency).mockReturnValue('$0.00');

		render(TokenFeeValue, { props: { feeInUSD: 0 } });

		expect(screen.getByText('Fee $0.00')).toBeInTheDocument();
	});

	it('should format different currencies', () => {
		vi.mocked(formatUtils.formatCurrency).mockReturnValue('€15,50');

		render(TokenFeeValue, { props: { feeInUSD: 15.5 } });

		expect(screen.getByText('Fee ~€15,50')).toBeInTheDocument();
	});

	it('should handle very small amounts', () => {
		vi.mocked(formatUtils.formatCurrency).mockReturnValue('$0.01');

		render(TokenFeeValue, { props: { feeInUSD: 0.01 } });

		expect(screen.getByText('Fee ~$0.01')).toBeInTheDocument();
	});

	it('should handle large amounts', () => {
		vi.mocked(formatUtils.formatCurrency).mockReturnValue('$999,999.99');

		render(TokenFeeValue, { props: { feeInUSD: 999999.99 } });

		expect(screen.getByText('Fee ~$999,999.99')).toBeInTheDocument();
	});

	it('should render output element', () => {
		const { container } = render(TokenFeeValue, { props: { feeInUSD: 999999.99 } });

		expect(container.querySelector('output')).toBeInTheDocument();
	});
});
