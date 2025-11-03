import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import GldtStakePositionCard from '$icp/components/stake/gldt/GldtStakePositionCard.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import type { IcToken } from '$icp/types/ic-token';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import type { TokenId } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockOneUsd } from '$tests/mocks/exchanges.mock';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GldtStakePositionCard', () => {
	const mockContext = () => {
		const store = initGldtStakeStore();
		store.setPosition({ ...stakePositionMockResponse, staked: 100000000000n });
		store.setApy(10);

		return new Map<symbol, GldtStakeContext>([[GLDT_STAKE_CONTEXT_KEY, { store }]]);
	};

	it('should display correct values if GLDT token is not available', () => {
		const { container } = render(GldtStakePositionCard, { context: mockContext() });

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.active_earning_per_year, { $amount: '$0.00' })
		);
	});

	it('should display correct values if GLDT token is available', () => {
		const gldtToken = {
			...mockIcrcCustomToken,
			id: Symbol('GLDT') as TokenId,
			standard: 'icrc',
			ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
			symbol: 'GLDT'
		} as IcToken;

		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
			readable({ [gldtToken.id]: { usd: mockOneUsd } })
		);

		const { container } = render(GldtStakePositionCard, {
			props: {
				gldtToken
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.active_earning_per_year, {
				$amount: `$100.00`
			})
		);
		// total staked USD amount
		expect(container).toHaveTextContent('$1,000.00');
	});
});
