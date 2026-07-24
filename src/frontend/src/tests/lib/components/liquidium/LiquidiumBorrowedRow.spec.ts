import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import LiquidiumBorrowedRow from '$lib/components/liquidium/LiquidiumBorrowedRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumBorrowedRow', () => {
	const reserve = (overrides: Partial<LiquidiumReserve> = {}): LiquidiumReserve => ({
		poolId: 'pool-usdc',
		asset: 'USDC',
		chain: 'ETH',
		supplyApy: 0,
		borrowApy: 4,
		deposited: ZERO,
		depositedDecimals: 6,
		// 1 USDC (6 decimals).
		borrowed: 1_000_000n,
		borrowedDecimals: 6,
		suppliedUsd: 0,
		borrowedUsd: 100,
		...overrides
	});

	// Seed the ckUSDC twin so the USDC ICP rail resolves via `findTwinToken`.
	const seedCkUsdcTwin = () => {
		icrcCustomTokensStore.setAll([
			{
				data: {
					...mockValidIcCkToken,
					symbol: 'ckUSDC',
					network: ICP_TOKEN.network,
					enabled: true
				} as IcrcCustomToken,
				certified: false
			}
		]);
	};

	beforeEach(() => {
		liquidiumStore.reset();
		icrcCustomTokensStore.resetAll();
	});

	it('renders the symbol and token name without the network', () => {
		const { container } = render(LiquidiumBorrowedRow, { props: { reserve: reserve() } });
		const usdc = USDC_TOKEN;

		expect(container).toHaveTextContent('USDC');
		expect(container).toHaveTextContent(usdc.name);
		expect(container).not.toHaveTextContent(usdc.network.name);
	});

	it('renders the borrow APR and the yearly cost as a negative amount', () => {
		const { container } = render(LiquidiumBorrowedRow, { props: { reserve: reserve() } });

		expect(container).toHaveTextContent(`${formatStakeApyNumber(4)}%`);
		expect(container).toHaveTextContent(en.borrow.text.apr);
		// currentlyPaying = 100 * 4 / 100 = $4/yr, shown as −$4.00/yr.
		expect(container).toHaveTextContent('−$4.00');
	});

	it('does not render a per-row action button', () => {
		const { queryByText } = render(LiquidiumBorrowedRow, { props: { reserve: reserve() } });

		expect(queryByText(en.liquidium.text.action_repay)).not.toBeInTheDocument();
	});

	it('lines up an icon for every rail the asset trades on', () => {
		const usdc = USDC_TOKEN;
		seedCkUsdcTwin();
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-usdc',
					asset: 'USDC',
					chain: 'ETH',
					supplyApy: 3,
					borrowApy: 4,
					frozen: false,
					available: true
				},
				{
					poolId: 'pool-usdc-icp',
					asset: 'USDC',
					chain: 'ICP',
					supplyApy: 3,
					borrowApy: 4,
					frozen: false,
					available: true
				}
			],
			portfolio: null,
			assetPrices: {}
		});

		const { getAllByAltText, getByAltText } = render(LiquidiumBorrowedRow, {
			props: { reserve: reserve() }
		});

		// ERC-20 rail first, then the ICP rail — both icons render (alts are `<url>-<index>`).
		expect(getByAltText(`${usdc.network.icon}-0`)).toBeInTheDocument();
		expect(getAllByAltText(/-\d+$/)).toHaveLength(2);
	});

	it('exposes the rail network names as an accessible label for the icon stack', () => {
		const usdc = USDC_TOKEN;
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-usdc',
					asset: 'USDC',
					chain: 'ETH',
					supplyApy: 3,
					borrowApy: 4,
					frozen: false,
					available: true
				}
			],
			portfolio: null,
			assetPrices: {}
		});

		const { getByRole } = render(LiquidiumBorrowedRow, { props: { reserve: reserve() } });

		expect(getByRole('img', { name: usdc.network.name })).toBeInTheDocument();
	});
});
