import type { IcToken } from '$icp/types/ic-token';
import TradingDepositReview from '$lib/components/trading/TradingDepositReview.svelte';
import { TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('TradingDepositReview', () => {
	const token: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8, fee: 10000n };

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

	it('should call onConfirm when the confirm button is clicked', async () => {
		const onConfirm = vi.fn();

		const { getByTestId } = render(TradingDepositReview, {
			props: { ...baseProps, onConfirm }
		});

		await fireEvent.click(getByTestId(TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON));

		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
