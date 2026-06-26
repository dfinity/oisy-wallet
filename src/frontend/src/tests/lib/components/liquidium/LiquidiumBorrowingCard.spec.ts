import LiquidiumBorrowingCard from '$lib/components/liquidium/LiquidiumBorrowingCard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumBorrowingCard', () => {
	const reserve = (overrides: Partial<LiquidiumReserve> = {}): LiquidiumReserve => ({
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 0,
		borrowApy: 9,
		deposited: ZERO,
		depositedDecimals: 8,
		// 0.01 BTC in satoshis.
		borrowed: 1_000_000n,
		borrowedDecimals: 8,
		suppliedUsd: 0,
		borrowedUsd: 1000,
		...overrides
	});

	it('renders the borrowed asset, the borrow rate (not APY) and the amount', () => {
		const { container } = render(LiquidiumBorrowingCard, { props: { reserve: reserve() } });

		expect(container).toHaveTextContent('BTC');
		expect(container).toHaveTextContent(`${formatStakeApyNumber(9)}%`);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_rate);
		// Debt framing: never the "APY" suffix used on the supply side.
		expect(container).not.toHaveTextContent(en.liquidium.text.apy_suffix);
	});

	it('decorates the owed value with a minus sign', () => {
		const { container } = render(LiquidiumBorrowingCard, { props: { reserve: reserve() } });

		expect(container.textContent).toContain('−');
	});
});
