import type {
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	UserSnapshot
} from '$declarations/rewards/rewards.did';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { registerAirdropRecipient } from '$lib/api/reward.api';
import * as authStore from '$lib/derived/auth.derived';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
import * as balancesStores from '$lib/stores/balances.store';
import { balancesStore, type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import type { WritableUpdateStore } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { BigNumber } from 'ethers';
import { readable } from 'svelte/store';

vi.mock('$lib/api/reward.api', () => ({
	registerAirdropRecipient: vi.fn()
}));

describe('user-snapshot.services', () => {
	describe('registerUserSnapshot', () => {
		const certified = false;

		const now = Date.now();

		const tokens: Token[] = [
			...mockTokens,
			mockValidIcToken,
			mockValidErc20Token,
			mockValidSplToken
		];

		const mockIcAmount = 123456n;

		const mockIcTransactions: IcTransactionUi[] = createMockIcTransactionsUi(7);

		const icrcAccounts: { Icrc: AccountSnapshot_Icrc }[] = [
			{
				Icrc: {
					decimals: ICP_TOKEN.decimals,
					approx_usd_per_token: 1,
					amount: mockIcAmount * 2n,
					timestamp: BigInt(now),
					network: {},
					account: Principal.from(ICP_TOKEN.ledgerCanisterId),
					last_transactions: []
				}
			},
			{
				Icrc: {
					decimals: mockValidIcToken.decimals,
					approx_usd_per_token: mockTokens.length + 1,
					amount: mockIcAmount,
					timestamp: BigInt(now),
					network: {},
					account: Principal.from(mockValidIcToken.ledgerCanisterId),
					last_transactions: []
				}
			}
		];

		const mockSplAmount = 987654n;

		const mockSolTransactions: SolTransactionUi[] = createMockSolTransactionsUi(13);

		const splMainnetAccounts: { SplMainnet: AccountSnapshot_Spl }[] = [
			{
				SplMainnet: {
					decimals: mockValidSplToken.decimals,
					approx_usd_per_token: mockTokens.length + 3,
					amount: mockSplAmount,
					timestamp: BigInt(now),
					network: {},
					account: mockValidSplToken.address,
					last_transactions: []
				}
			}
		];

		const userSnapshot: UserSnapshot = {
			accounts: [...icrcAccounts, ...splMainnetAccounts]
		};

		const mockExchangesData: ExchangesData = tokens.reduce<ExchangesData>(
			(acc, { id }, idx) => ({
				...acc,
				[id]: { usd: 1 + idx }
			}),
			{}
		);

		const mockExchangeStore = () =>
			vi
				.spyOn(exchangeDerived, 'exchanges', 'get')
				.mockImplementation(() => readable(mockExchangesData));

		const mockAuthStore = (value: Identity | null = mockIdentity) =>
			vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

		beforeEach(() => {
			vi.resetAllMocks();
			vi.restoreAllMocks();
			vi.clearAllMocks();

			vi.useFakeTimers().setSystemTime(now);

			mockAuthStore();

			vi.spyOn(tokensDerived, 'tokens', 'get').mockImplementation(() => readable(tokens));

			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
			});
			balancesStore.set({
				tokenId: ICP_TOKEN.id,
				data: { data: BigNumber.from(mockIcAmount * 2n), certified }
			});
			balancesStore.set({
				tokenId: ETHEREUM_TOKEN.id,
				data: { data: BigNumber.from(mockIcAmount + mockSplAmount), certified }
			});
			balancesStore.set({
				tokenId: mockValidIcToken.id,
				data: { data: BigNumber.from(mockIcAmount), certified }
			});
			balancesStore.set({
				tokenId: mockValidSplToken.id,
				data: { data: BigNumber.from(mockSplAmount), certified }
			});

			vi.spyOn(exchangeDerived, 'exchanges', 'get').mockImplementation(() =>
				readable(mockExchangesData)
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should do nothing if balances are missing', async () => {
			vi.spyOn(balancesStores, 'balancesStore', 'get').mockImplementationOnce(
				() =>
					readable(undefined) as CertifiedSetterStoreStore<BalancesData> &
						WritableUpdateStore<BalancesData>
			);

			await registerUserSnapshot();

			expect(registerAirdropRecipient).not.toHaveBeenCalled();
		});

		it('should do nothing if no tokens are present', async () => {
			vi.spyOn(tokensDerived, 'tokens', 'get').mockImplementationOnce(() => readable([]));

			await registerUserSnapshot();

			expect(registerAirdropRecipient).not.toHaveBeenCalled();
		});

		it('should do nothing if no balances are found', async () => {
			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
			});

			await registerUserSnapshot();

			expect(registerAirdropRecipient).not.toHaveBeenCalled();
		});

		it('should do nothing if no exchange rates are found', async () => {
			vi.spyOn(exchangeDerived, 'exchanges', 'get').mockImplementation(() => readable({}));

			await registerUserSnapshot();

			expect(registerAirdropRecipient).not.toHaveBeenCalled();
		});

		it('should handle multiple tokens and send correct snapshots', async () => {
			// mockExchangeStore();
			// mockAuthStore();

			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot,
				identity: mockIdentity
			});
		});

		it('should not include tokens with zero balance', async () => {
			balancesStore.set({
				tokenId: mockValidIcToken.id,
				data: { data: BigNumber.from(0), certified }
			});

			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot: { accounts: [...icrcAccounts.slice(0, 1), ...splMainnetAccounts] },
				identity: mockIdentity
			});
		});
	});
});
