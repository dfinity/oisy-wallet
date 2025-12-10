import type { StakePositionResponse } from '$declarations/gldt_stake/gldt_stake.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { ZERO } from '$lib/constants/app.constants';
import { stakeBalances } from '$lib/derived/stake.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { get } from 'svelte/store';

const mockGldtToken = {
	id: parseTokenId('GOLDAO'),
	symbol: 'GLDT',
	name: 'Gold DAO Token',
	decimals: 8,
	network: ICP_NETWORK,
	address: '0xabc',
	enabled: true,
	standard: 'icrc',
	ledgerCanisterId: GLDT_LEDGER_CANISTER_ID
} as unknown as IcrcCustomToken;

describe('stake.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		gldtStakeStore.reset();

		icrcCustomTokensStore.setAll([{ data: mockGldtToken, certified: true }]);
	});

	describe('stakeBalances', () => {
		describe('with GLDT stake store', () => {
			it('should correctly map values for GLDT', () => {
				gldtStakeStore.setPosition({
					staked: 1000000000n,
					claimable_rewards: [[{ GLDT: null }, 123_456n]]
				} as unknown as StakePositionResponse);

				expect(get(stakeBalances)).toStrictEqual({
					[mockGldtToken.id]: {
						staked: 1000000000n,
						claimable: 123_456n
					}
				});
			});

			it('should handle missing position', () => {
				gldtStakeStore.setPosition({} as unknown as StakePositionResponse);

				expect(get(stakeBalances)).toStrictEqual({
					[mockGldtToken.id]: {
						staked: ZERO,
						claimable: ZERO
					}
				});
			});

			it('should handle missing claimable rewards', () => {
				gldtStakeStore.setPosition({
					staked: 1000000000n
				} as unknown as StakePositionResponse);

				expect(get(stakeBalances)).toStrictEqual({
					[mockGldtToken.id]: {
						staked: 1000000000n,
						claimable: ZERO
					}
				});
			});

			it('should handle missing staked balance', () => {
				gldtStakeStore.setPosition({
					claimable_rewards: [[{ GLDT: null }, 123_456n]]
				} as unknown as StakePositionResponse);

				expect(get(stakeBalances)).toStrictEqual({
					[mockGldtToken.id]: {
						staked: ZERO,
						claimable: 123_456n
					}
				});
			});

			it('should handle a different token in claimable rewards', () => {
				gldtStakeStore.setPosition({
					staked: 1000000000n,
					claimable_rewards: [[{ ICP: null }, 123_456n]]
				} as unknown as StakePositionResponse);

				expect(get(stakeBalances)).toStrictEqual({
					[mockGldtToken.id]: {
						staked: 1000000000n,
						claimable: ZERO
					}
				});
			});

			it('should handle missing GLDT token gracefully', () => {
				icrcCustomTokensStore.resetAll();

				expect(get(stakeBalances)).toStrictEqual({});
			});
		});
	});
});
