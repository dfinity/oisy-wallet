import type {
	_SERVICE as OisyTradeService,
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.canister', () => {
	const createOisyTradeCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<OisyTradeService>, 'serviceOverride'>): Promise<OisyTradeCanister> =>
		OisyTradeCanister.create({
			canisterId: Principal.fromText('proc5-daaaa-aaaar-qb5va-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<OisyTradeService>>();
	const ledgerId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
	const token: Token = {
		id: { ledger_id: ledgerId },
		metadata: {
			decimals: 8,
			symbol: 'ckBTC'
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTradingPairs', () => {
		it('should return trading pairs from the query endpoint', async () => {
			const response: TradingPairInfo[] = [
				{
					status: { Trading: null },
					base: token,
					quote: token,
					min_notional: 1_000n,
					lot_size: 100n,
					taker_fee_bps: 10,
					maker_fee_bps: 5,
					tick_size: 1n,
					max_notional: []
				}
			];
			service.get_trading_pairs.mockResolvedValue(response);

			const { getTradingPairs } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getTradingPairs()).resolves.toBe(response);
			expect(service.get_trading_pairs).toHaveBeenCalledExactlyOnceWith();
		});
	});

	describe('listSupportedTokens', () => {
		it('should return tokens from the query endpoint', async () => {
			const response: Token[] = [token];
			service.list_supported_tokens.mockResolvedValue(response);

			const { listSupportedTokens } = await createOisyTradeCanister({
				serviceOverride: service
			});

			await expect(listSupportedTokens()).resolves.toBe(response);
			expect(service.list_supported_tokens).toHaveBeenCalledExactlyOnceWith();
		});
	});

	describe('getBalances', () => {
		const response: UserTokenBalance[] = [
			{
				token,
				balance: {
					free: 1_000n,
					reserved: 250n
				}
			}
		];

		it('should request all balances and unwrap the ok response', async () => {
			service.get_balances.mockResolvedValue({ Ok: response });

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).resolves.toBe(response);
			expect(service.get_balances).toHaveBeenCalledExactlyOnceWith([]);
		});

		it('should throw the canister error message when balances fail', async () => {
			service.get_balances.mockResolvedValue({
				Err: {
					kind: { InternalError: [] },
					message: ['Balance index unavailable']
				}
			});

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow(new Error('Balance index unavailable'));
		});

		it('should fall back to the canister error kind when no message is provided', async () => {
			service.get_balances.mockResolvedValue({
				Err: {
					kind: { RequestError: [] },
					message: []
				}
			});

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow(new Error('RequestError'));
		});
	});
});
