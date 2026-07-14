import { goto } from '$app/navigation';
import LiquidiumPositionCard from '$lib/components/liquidium/LiquidiumPositionCard.svelte';
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

// Assets → Earning tab holdings row: no action, clicks through to the provider page.
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

	it('renders the supplied asset and APY', () => {
		const { container } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

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

	it('renders the Liquidium provider tag', () => {
		const { container } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

		expect(container).toHaveTextContent(
			lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
		);
	});

	it('does not render a Withdraw action button', () => {
		const { queryByText } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

		expect(queryByText(en.liquidium.text.action_withdraw)).not.toBeInTheDocument();
	});

	it('navigates to the Liquidium provider page when clicked', async () => {
		const { getByRole } = render(LiquidiumPositionCard, { props: { reserve: reserve() } });

		await fireEvent.click(getByRole('button'));

		expect(goto).toHaveBeenCalledWith(AppPath.ProvidersLiquidium);
	});
});
