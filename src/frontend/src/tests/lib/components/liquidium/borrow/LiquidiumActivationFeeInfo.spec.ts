import LiquidiumActivationFeeInfo from '$lib/components/liquidium/borrow/LiquidiumActivationFeeInfo.svelte';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumActivationFeeInfo', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const testId = 'liquidium-activation-fee-info';

	it('shows the activation fee rate when the pool charges one', () => {
		const { getByTestId } = render(LiquidiumActivationFeeInfo, {
			props: { market: { ...market, activationFeePercent: 0.5 } }
		});

		expect(getByTestId(testId)).toHaveTextContent(
			replacePlaceholders(en.liquidium.text.borrow_activation_fee_info, { $fee: '0.50' })
		);
	});

	it('renders nothing when the activation fee is zero', () => {
		const { queryByTestId } = render(LiquidiumActivationFeeInfo, {
			props: { market: { ...market, activationFeePercent: 0 } }
		});

		expect(queryByTestId(testId)).not.toBeInTheDocument();
	});

	it('renders nothing when the market has no activation fee', () => {
		const { queryByTestId } = render(LiquidiumActivationFeeInfo, { props: { market } });

		expect(queryByTestId(testId)).not.toBeInTheDocument();
	});
});
