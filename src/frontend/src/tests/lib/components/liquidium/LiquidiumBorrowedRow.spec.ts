import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import LiquidiumBorrowedRow from '$lib/components/liquidium/LiquidiumBorrowedRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
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

	it('renders the symbol, token name and network', () => {
		const { container } = render(LiquidiumBorrowedRow, { props: { reserve: reserve() } });
		const usdc = USDC_TOKEN;

		expect(container).toHaveTextContent('USDC');
		expect(container).toHaveTextContent(usdc.name);
		expect(container).toHaveTextContent(usdc.network.name);
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
});
