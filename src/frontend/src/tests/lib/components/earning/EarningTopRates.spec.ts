import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import EarningTopRates from '$lib/components/earning/EarningTopRates.svelte';
import * as earningDerived from '$lib/derived/earning.derived';
import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
import type { EarningTopRate } from '$lib/types/earning';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('EarningTopRates', () => {
	const topRate = (overrides: Partial<EarningTopRate>): EarningTopRate => ({
		id: 'liquidium-pool-usdt',
		providerId: 'liquidium',
		token: USDT_TOKEN,
		symbol: 'USDT',
		networkIcons: [],
		networkNames: [],
		apy: 6.47,
		earningPotentialUsd: 64.7,
		hasPosition: false,
		action: vi.fn(),
		...overrides
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(earningDerived, 'earningUninvestedUsd', 'get').mockReturnValue(readable(1_000));
	});

	it('is hidden when no rate reaches the threshold', () => {
		vi.spyOn(earningDerived, 'earningTopRates', 'get').mockReturnValue(readable([]));

		const { container } = render(EarningTopRates);

		expect(container).not.toHaveTextContent(en.earning.text.top_rates);
	});

	it('lists one row per top rate under its title', () => {
		vi.spyOn(earningDerived, 'earningTopRates', 'get').mockReturnValue(
			readable([
				topRate({}),
				topRate({
					id: 'harvest-autopilot-0x0d87',
					providerId: 'harvest-autopilot',
					token: USDC_TOKEN,
					symbol: 'USDC',
					apy: 5.75
				})
			])
		);

		const { container, getAllByRole } = render(EarningTopRates);

		expect(container).toHaveTextContent(en.earning.text.top_rates);
		expect(getAllByRole('button')).toHaveLength(2);
		expect(container).toHaveTextContent('USDT');
		expect(container).toHaveTextContent('USDC');
	});

	it('opens a top rate with the Earn page as its source', async () => {
		const action = vi.fn().mockResolvedValue(undefined);

		vi.spyOn(earningDerived, 'earningTopRates', 'get').mockReturnValue(
			readable([topRate({ action })])
		);

		const { getByRole } = render(EarningTopRates);

		await fireEvent.click(getByRole('button'));

		expect(action).toHaveBeenCalledExactlyOnceWith(PLAUSIBLE_EVENT_SOURCE_LOCATIONS.EARN);
	});
});
