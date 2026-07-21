import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumSuppliedRow from '$lib/components/liquidium/LiquidiumSuppliedRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumSuppliedRow', () => {
	const reserve = (overrides: Partial<LiquidiumReserve> = {}): LiquidiumReserve => ({
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 0,
		// 1 BTC in satoshis.
		deposited: 100_000_000n,
		depositedDecimals: 8,
		borrowed: ZERO,
		borrowedDecimals: 8,
		suppliedUsd: 1000,
		borrowedUsd: 0,
		...overrides
	});

	it('renders the symbol, token name and network', () => {
		const { container } = render(LiquidiumSuppliedRow, { props: { reserve: reserve() } });
		const btc = BTC_MAINNET_TOKEN;

		expect(container).toHaveTextContent('BTC');
		expect(container).toHaveTextContent(btc.name);
		expect(container).toHaveTextContent(btc.network.name);
	});

	it('renders the supply APY and yearly earning', () => {
		const { container } = render(LiquidiumSuppliedRow, { props: { reserve: reserve() } });

		expect(container).toHaveTextContent(`${formatStakeApyNumber(5)}%`);
		expect(container).toHaveTextContent(en.liquidium.text.apy_suffix);
		// currentlyEarning = 1000 * 5 / 100 = $50/yr.
		expect(container).toHaveTextContent('$50.00');
	});

	it('does not render a per-row action button', () => {
		const { queryByText } = render(LiquidiumSuppliedRow, { props: { reserve: reserve() } });

		expect(queryByText(en.liquidium.text.action_withdraw)).not.toBeInTheDocument();
	});
});
