import type { IcToken } from '$icp/types/ic-token';
import TradingDepositReview from '$lib/components/trading/TradingDepositReview.svelte';
import { TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

const { exchangesMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return { exchangesMock: createWritable({}) };
});

vi.mock(import('$lib/derived/exchange.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get exchanges() {
		return exchangesMock;
	}
}));

describe('TradingDepositReview', () => {
	const token: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8, fee: 10000n };

	beforeEach(() => {
		exchangesMock.set({});
	});

	const baseProps = {
		token,
		amount: 5,
		onBack: () => {},
		onConfirm: () => {}
	};

	it('should render the deposit subtitle, provider name and fee breakdown labels', () => {
		const { getByText } = render(TradingDepositReview, { props: { ...baseProps } });

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.network)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.transaction_fee)).toBeInTheDocument();
	});

	it('should render the OISY Trade logo next to the provider name', () => {
		const { getByLabelText } = render(TradingDepositReview, { props: { ...baseProps } });

		expect(getByLabelText('OISY Trade')).toBeInTheDocument();
	});

	it('should render the fee breakdown in fiat when an exchange rate is available', () => {
		exchangesMock.set({ [token.id]: { usd: 7 } });

		const { getAllByText, getByText } = render(TradingDepositReview, { props: { ...baseProps } });

		expect(getByText(en.trading.deposit.transaction_fee)).toBeInTheDocument();
		// The fiat branch formats fees through `formatCurrency` (default USD), so a
		// "$"-prefixed value is rendered instead of the raw token amount + symbol.
		expect(getAllByText((content) => content.includes('$')).length).toBeGreaterThan(0);
	});

	it('should call onConfirm when the confirm button is clicked', async () => {
		const onConfirm = vi.fn();

		const { getByTestId } = render(TradingDepositReview, {
			props: { ...baseProps, onConfirm }
		});

		await fireEvent.click(getByTestId(TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON));

		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
