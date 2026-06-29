import LiquidiumPositionCard from '$lib/components/liquidium/LiquidiumPositionCard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { modalLiquidiumWithdraw } from '$lib/derived/modal.derived';
import { modalStore } from '$lib/stores/modal.store';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

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
});
