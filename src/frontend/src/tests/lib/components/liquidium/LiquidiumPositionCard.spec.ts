import { goto } from '$app/navigation';
import LiquidiumPositionCard from '$lib/components/liquidium/LiquidiumPositionCard.svelte';
import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
import { ZERO } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { modalLiquidiumWithdraw } from '$lib/derived/modal.derived';
import { modalStore } from '$lib/stores/modal.store';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('LiquidiumPositionCard', () => {
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

	it('renders the supplied asset, APY and amount', () => {
		const { container } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

		// The "Supplied" label lives on the section header now, not the card.
		expect(container).toHaveTextContent('BTC');
		expect(container).toHaveTextContent(en.liquidium.text.apy_suffix);
		expect(container).toHaveTextContent(`${formatStakeApyNumber(5)}%`);
	});

	it('does not show the yearly earning when the supplied value is zero', () => {
		const { container } = render(LiquidiumPositionCard, {
			props: { reserve: reserve({ suppliedUsd: 0 }) }
		});

		expect(container).not.toHaveTextContent('/year');
	});

	it('renders a zero APY position (default badge variant)', () => {
		const { container } = render(LiquidiumPositionCard, {
			props: { reserve: reserve({ supplyApy: 0 }) }
		});

		expect(container).toHaveTextContent(`${formatStakeApyNumber(0)}%`);
	});

	it('opens the withdraw modal from the Withdraw button', async () => {
		modalStore.close();

		const { getByRole } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

		await fireEvent.click(getByRole('button', { name: en.liquidium.text.action_withdraw }));

		expect(get(modalLiquidiumWithdraw)).toBeTruthy();

		modalStore.close();
	});

	it('does not render the provider tag in the provider variant', () => {
		const { container } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

		expect(container).not.toHaveTextContent(
			lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
		);
	});

	describe('holdings variant', () => {
		it('does not render the Withdraw action button', () => {
			const { queryByText } = render(LiquidiumPositionCard, {
				props: { reserve: reserve(), variant: 'holdings' }
			});

			expect(queryByText(en.liquidium.text.action_withdraw)).not.toBeInTheDocument();
		});

		it('renders the Liquidium provider tag', () => {
			const { container } = render(LiquidiumPositionCard, {
				props: { reserve: reserve(), variant: 'holdings' }
			});

			expect(container).toHaveTextContent(
				lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
			);
		});

		it('navigates to the Liquidium provider page when clicked', async () => {
			const { getByRole } = render(LiquidiumPositionCard, {
				props: { reserve: reserve(), variant: 'holdings' }
			});

			await fireEvent.click(getByRole('button'));

			expect(goto).toHaveBeenCalledWith(AppPath.ProvidersLiquidium);
		});
	});
});
