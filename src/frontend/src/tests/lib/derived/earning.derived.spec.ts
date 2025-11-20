import type { StakePositionResponse } from '$declarations/gldt_stake/gldt_stake.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { earningData } from '$lib/derived/earning.derived';
import { i18n } from '$lib/stores/i18n.store';
import { usdValue } from '$lib/utils/exchange.utils';
import * as tokenUtils from '$lib/utils/token.utils';
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

describe('earning.derived', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		gldtStakeStore.reset();

		icrcCustomTokensStore.set({ data: mockGldtToken, certified: true });

		vi.spyOn(tokenUtils, 'calculateTokenUsdAmount').mockImplementation(({ amount }) =>
			usdValue({ decimals: mockGldtToken.decimals, balance: amount, exchangeRate: 1 })
		);

		vi.mock('$lib/derived/tokens.derived', async (importOriginal) => {
			const actual = await importOriginal<typeof import('$lib/derived/tokens.derived')>();

			const staticStore = <T>(value: T) => ({
				subscribe: (fn: (v: T) => void): (() => void) => {
					fn(value);
					return () => {};
				}
			});

			return {
				...actual,
				enabledMainnetFungibleTokensUsdBalance: staticStore(1000)
			};
		});
	});

	describe('earningData', () => {
		it('correctly formatted values for GLDT', () => {
			gldtStakeStore.setApy(10);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			const result = get(earningData);

			const record = result['gldt-staking'];

			expect(record[EarningCardFields.APY]).toBe('10.0');
			expect(record[EarningCardFields.CURRENT_STAKED]).toBe('10 GLDT');
			expect(record[EarningCardFields.CURRENT_EARNING]).toBe(10);
			expect(record[EarningCardFields.EARNING_POTENTIAL]).toBe(100);
			expect(record[EarningCardFields.TERMS]).toBe(get(i18n).earning.terms.flexible);

			expect(typeof record.action).toBe('function');
		});

		it('handles missing GLDT APY', () => {
			gldtStakeStore.setApy(undefined as unknown as number);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			const result = get(earningData);
			const rec = result['gldt-staking'];

			expect(rec[EarningCardFields.APY]).toBeUndefined();
			expect(rec[EarningCardFields.EARNING_POTENTIAL]).toBeUndefined();
		});

		it('handles missing GLDT token gracefully', () => {
			icrcCustomTokensStore.resetAll();

			const result = get(earningData);
			const rec = result['gldt-staking'];

			expect(rec[EarningCardFields.CURRENT_STAKED]).toBeUndefined();
			expect(rec[EarningCardFields.CURRENT_EARNING]).toBeUndefined();
		});
	});
});
