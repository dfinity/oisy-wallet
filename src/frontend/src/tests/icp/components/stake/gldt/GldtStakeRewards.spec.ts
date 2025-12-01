import type { StakePositionResponse, TokenSymbol } from '$declarations/gldt_stake/gldt_stake.did';
import GldtStakeRewards from '$icp/components/stake/gldt/GldtStakeRewards.svelte';
import * as icrcServices from '$icp/services/icrc.services';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { ZERO } from '$lib/constants/app.constants';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { nonNullish, toNullable } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('GldtStakeRewards', () => {
	const getPosition = (amount: bigint): StakePositionResponse => ({
		...stakePositionMockResponse,
		claimable_rewards: toNullable([{ [mockIcrcCustomToken.symbol]: null } as TokenSymbol, amount])
	});

	const mockContext = (position: StakePositionResponse | undefined) => {
		const store = initGldtStakeStore();

		nonNullish(position) && store.setPosition(position);

		return new Map<symbol, GldtStakeContext>([[GLDT_STAKE_CONTEXT_KEY, { store }]]);
	};
	const getLoadDisabledIcrcTokensExchangesMock = () =>
		vi.spyOn(icrcServices, 'loadDisabledIcrcTokensExchanges').mockResolvedValue(undefined);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetAllMocks();

		icrcCustomTokensStore.resetAll();
	});

	it('should display correct data and fetch missing exchanges if reward token is disabled', () => {
		icrcCustomTokensStore.set({
			data: mockIcrcCustomToken,
			certified: false
		});
		const mock = getLoadDisabledIcrcTokensExchangesMock();

		const { container } = render(GldtStakeRewards, {
			context: mockContext(getPosition(100n))
		});

		expect(container).toHaveTextContent(mockIcrcCustomToken.name);

		vi.advanceTimersByTime(1000);

		expect(mock).toHaveBeenCalledOnce();
	});

	it('should display correct data and skip fetching exchanges if reward token is enabled', () => {
		icrcCustomTokensStore.set({
			data: {
				...mockIcrcCustomToken,
				enabled: true
			},
			certified: false
		});
		const mock = getLoadDisabledIcrcTokensExchangesMock();

		const { container } = render(GldtStakeRewards, {
			context: mockContext(getPosition(100n))
		});

		expect(container).toHaveTextContent(mockIcrcCustomToken.name);

		vi.advanceTimersByTime(1000);

		expect(mock).not.toHaveBeenCalledOnce();
	});

	it('should display correct data and skip fetching exchanges if reward token has zero amount', () => {
		icrcCustomTokensStore.set({
			data: mockIcrcCustomToken,
			certified: false
		});
		const mock = getLoadDisabledIcrcTokensExchangesMock();

		const { container } = render(GldtStakeRewards, {
			context: mockContext(getPosition(ZERO))
		});

		expect(container).toHaveTextContent(mockIcrcCustomToken.name);

		vi.advanceTimersByTime(1000);

		expect(mock).not.toHaveBeenCalledOnce();
	});

	it('should not display anything and skip fetching exchanges if position is unavailable', () => {
		icrcCustomTokensStore.set({
			data: mockIcrcCustomToken,
			certified: false
		});
		const mock = getLoadDisabledIcrcTokensExchangesMock();

		const { container } = render(GldtStakeRewards, {
			context: mockContext(undefined)
		});

		expect(container).not.toHaveTextContent(mockIcrcCustomToken.name);

		vi.advanceTimersByTime(1000);

		expect(mock).not.toHaveBeenCalledOnce();
	});
});
