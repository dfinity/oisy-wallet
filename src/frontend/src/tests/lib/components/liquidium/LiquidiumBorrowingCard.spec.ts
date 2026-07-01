import { goto } from '$app/navigation';
import LiquidiumBorrowingCard from '$lib/components/liquidium/LiquidiumBorrowingCard.svelte';
import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
import { ZERO } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

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

	it('renders a Repay action button', () => {
		const { getByText } = render(LiquidiumBorrowingCard, { props: { reserve: reserve() } });

		expect(getByText(en.liquidium.text.action_repay)).toBeInTheDocument();
	});

	it('does not render the provider tag in the provider variant', () => {
		const { container } = render(LiquidiumBorrowingCard, { props: { reserve: reserve() } });

		expect(container).not.toHaveTextContent(
			lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
		);
	});

	describe('holdings variant', () => {
		it('does not render the Repay action button', () => {
			const { queryByText } = render(LiquidiumBorrowingCard, {
				props: { reserve: reserve(), variant: 'holdings' }
			});

			expect(queryByText(en.liquidium.text.action_repay)).not.toBeInTheDocument();
		});

		it('renders the Liquidium provider tag', () => {
			const { container } = render(LiquidiumBorrowingCard, {
				props: { reserve: reserve(), variant: 'holdings' }
			});

			expect(container).toHaveTextContent(
				lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
			);
		});

		it('navigates to the Liquidium provider page when clicked', async () => {
			const { getByRole } = render(LiquidiumBorrowingCard, {
				props: { reserve: reserve(), variant: 'holdings' }
			});

			await fireEvent.click(getByRole('button'));

			expect(goto).toHaveBeenCalledWith(AppPath.ProvidersLiquidium);
		});
	});
});
