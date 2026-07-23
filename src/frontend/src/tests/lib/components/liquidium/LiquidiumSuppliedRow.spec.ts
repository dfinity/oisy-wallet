import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumSuppliedRow from '$lib/components/liquidium/LiquidiumSuppliedRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
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

	beforeEach(() => {
		liquidiumStore.reset();
	});

	it('renders the symbol and token name without the network suffix', () => {
		const { container } = render(LiquidiumSuppliedRow, { props: { reserve: reserve() } });
		const btc = BTC_MAINNET_TOKEN;

		expect(container).toHaveTextContent('BTC');
		expect(container).toHaveTextContent(btc.name);
		expect(container).not.toHaveTextContent(
			replacePlaceholders(en.tokens.text.on_network, { $network: btc.network.name })
		);
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

	it('lines up the network icons of the rails the asset trades on', () => {
		const btc = BTC_MAINNET_TOKEN;
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-btc',
					asset: 'BTC',
					chain: 'BTC',
					supplyApy: 5,
					borrowApy: 9,
					frozen: false,
					available: true
				}
			],
			portfolio: null,
			assetPrices: {}
		});

		const { getByAltText } = render(LiquidiumSuppliedRow, { props: { reserve: reserve() } });

		expect(getByAltText(`${btc.network.icon}-0`)).toBeInTheDocument();
	});

	it('exposes the rail network names as an accessible label for the icon stack', () => {
		const btc = BTC_MAINNET_TOKEN;
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-btc',
					asset: 'BTC',
					chain: 'BTC',
					supplyApy: 5,
					borrowApy: 9,
					frozen: false,
					available: true
				}
			],
			portfolio: null,
			assetPrices: {}
		});

		const { getByRole } = render(LiquidiumSuppliedRow, { props: { reserve: reserve() } });

		expect(getByRole('img', { name: btc.network.name })).toBeInTheDocument();
	});
});
