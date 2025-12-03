import type {
	DissolveStakeEvent,
	StakePositionResponse
} from '$declarations/gldt_stake/gldt_stake.did';
import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import GldtStakeDissolveEvents from '$icp/components/stake/gldt/GldtStakeDissolveEvents.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import type { IcToken } from '$icp/types/ic-token';
import { STAKE_DISSOLVE_EVENTS_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
import type { TokenId } from '$lib/types/token';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { nonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('GldtStakeDissolveEvents', () => {
	const gldtToken = {
		...mockIcrcCustomToken,
		id: Symbol('GLDT') as TokenId,
		standard: 'icrc',
		ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
		symbol: 'GLDT'
	} as IcToken;

	const getEvents = (events: DissolveStakeEvent[]): StakePositionResponse => ({
		...stakePositionMockResponse,
		dissolve_events: events
	});

	const mockContext = (position: StakePositionResponse | undefined) => {
		const store = initGldtStakeStore();

		nonNullish(position) && store.setPosition(position);

		return new Map<symbol, GldtStakeContext>([[GLDT_STAKE_CONTEXT_KEY, { store }]]);
	};

	it('does not display the section if events are not available', () => {
		const { getByText } = render(GldtStakeDissolveEvents, {
			props: { gldtToken },
			context: mockContext(getEvents([]))
		});

		expect(() => getByText(en.stake.text.unlock_requests)).toThrow();
	});

	it('does display the section if events are available', () => {
		const { getByText } = render(GldtStakeDissolveEvents, {
			props: { gldtToken },
			context: mockContext(getEvents(stakePositionMockResponse.dissolve_events))
		});

		expect(getByText(en.stake.text.unlock_requests)).toBeInTheDocument();
	});

	it('should keep the withdraw button enabled if events are withdrawable', () => {
		const { getByTestId } = render(GldtStakeDissolveEvents, {
			props: { gldtToken },
			context: mockContext(getEvents(stakePositionMockResponse.dissolve_events))
		});

		expect(getByTestId(STAKE_DISSOLVE_EVENTS_WITHDRAW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should keep the withdraw button disabled if events are not withdrawable', () => {
		const { getByTestId } = render(GldtStakeDissolveEvents, {
			props: { gldtToken },
			context: mockContext(
				getEvents([
					{
						...stakePositionMockResponse.dissolve_events[0],
						dissolved_date: BigInt(Date.now() + 100000000)
					}
				])
			)
		});

		expect(getByTestId(STAKE_DISSOLVE_EVENTS_WITHDRAW_BUTTON)).toHaveAttribute('disabled');
	});
});
