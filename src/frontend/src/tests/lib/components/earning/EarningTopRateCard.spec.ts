import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import EarningTopRateCard from '$lib/components/earning/EarningTopRateCard.svelte';
import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
import { currentCurrency } from '$lib/derived/currency.derived';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import type { EarningTopRate } from '$lib/types/earning';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import { formatCurrency, formatStakeApyNumber } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('EarningTopRateCard', () => {
	const topRate = (overrides: Partial<EarningTopRate> = {}): EarningTopRate => ({
		id: 'liquidium-pool-usdt',
		providerId: 'liquidium',
		token: USDT_TOKEN,
		symbol: 'USDT',
		networkIcons: ['eth-icon', 'icp-icon'],
		networkNames: ['Ethereum', 'Internet Computer'],
		apy: 6.47,
		earningPotentialUsd: 64.7,
		hasPosition: false,
		action: vi.fn().mockResolvedValue(undefined),
		...overrides
	});

	const usd = (value: number): string =>
		formatCurrency({
			value,
			currency: get(currentCurrency),
			exchangeRate: get(currencyExchangeStore),
			language: get(currentLanguage)
		}) ?? '';

	it('shows the token, its APY and the Liquidium tag', () => {
		const { container } = render(EarningTopRateCard, {
			props: { topRate: topRate(), uninvestedUsd: 1_000 }
		});

		expect(container).toHaveTextContent('USDT');
		expect(container).toHaveTextContent(
			`${formatStakeApyNumber(6.47)}% ${en.earning.card_fields.apy}`
		);
		expect(container).toHaveTextContent(
			lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
		);
	});

	it('shows the Autopilot tag for an Autopilot vault', () => {
		const { container } = render(EarningTopRateCard, {
			props: { topRate: topRate({ providerId: 'harvest-autopilot' }), uninvestedUsd: 1_000 }
		});

		expect(container).toHaveTextContent(en.vaults.text.autopilot);
	});

	it('names every network the rate applies to', () => {
		const { getByRole } = render(EarningTopRateCard, {
			props: { topRate: topRate(), uninvestedUsd: 1_000 }
		});

		expect(getByRole('img', { name: 'Ethereum, Internet Computer' })).toBeInTheDocument();
	});

	it('shows the yearly amount and the total not invested it is based on', () => {
		const { container } = render(EarningTopRateCard, {
			props: { topRate: topRate(), uninvestedUsd: 1_000 }
		});

		expect(container).toHaveTextContent(`+${usd(64.7)}/yr`);
		expect(container).toHaveTextContent(usd(1_000));
	});

	it('opens the opportunity from the Earn page when clicked', async () => {
		const action = vi.fn().mockResolvedValue(undefined);

		const { getByRole } = render(EarningTopRateCard, {
			props: { topRate: topRate({ action }), uninvestedUsd: 1_000 }
		});

		await fireEvent.click(getByRole('button'));

		expect(action).toHaveBeenCalledExactlyOnceWith(PLAUSIBLE_EVENT_SOURCE_LOCATIONS.EARN);
	});
});
