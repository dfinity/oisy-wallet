import type {
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	Transaction_Icrc,
	Transaction_Spl,
	UserSnapshot
} from '$declarations/rewards/rewards.did';
import * as airdropEnv from '$env/airdrop-campaigns.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { registerAirdropRecipient } from '$lib/api/reward.api';
import { NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import * as addressStore from '$lib/derived/address.derived';
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
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import { BigNumber } from 'ethers';
import { readable } from 'svelte/store';

vi.mock('$lib/api/reward.api', () => ({
	registerAirdropRecipient: vi.fn()
}));

describe('user-snapshot.services', () => {
	describe('registerUserSnapshot', () => {
		const certified = false;

		const now = Date.now();
		const nowNanoseconds = BigInt(now) * NANO_SECONDS_IN_MILLISECOND;

		const tokens: Token[] = [
			...mockTokens,
			mockValidIcToken,
			mockValidErc20Token,
			SOLANA_TOKEN,
			mockValidSplToken
		];

		const mockIcAmount = 123456n;

		const mockIcTransactions: IcTransactionUi[] = createMockIcTransactionsUi(7).map((tx) => ({
			...tx,
			from: mockPrincipalText
		}));

		const icrcAccounts: { Icrc: AccountSnapshot_Icrc }[] = [
			{
				Icrc: {
					decimals: ICP_TOKEN.decimals,
					approx_usd_per_token: 1,
					amount: mockIcAmount * 2n,
					timestamp: nowNanoseconds,
					network: {},
					account: mockIdentity.getPrincipal(),
					token_address: Principal.from(ICP_TOKEN.ledgerCanisterId),
					last_transactions: mockIcTransactions.slice(0, 5).map(
						({ value, timestamp }: IcTransactionUi): Transaction_Icrc => ({
							transaction_type: { Send: null },
							timestamp: timestamp ?? 0n,
							amount: value ?? 0n,
							network: {},
							counterparty: Principal.anonymous()
						})
					)
				}
			},
			{
				Icrc: {
					decimals: mockValidIcToken.decimals,
					approx_usd_per_token: mockTokens.length + 1,
					amount: mockIcAmount,
					timestamp: nowNanoseconds,
					network: {},
					account: mockIdentity.getPrincipal(),
					token_address: Principal.from(mockValidIcToken.ledgerCanisterId),
					last_transactions: []
				}
			}
		];

		const mockSplAmount = 987654n;

		const mockSolTransactions: SolTransactionUi[] = createMockSolTransactionsUi(13).map((tx) => ({
			...tx,
			from: mockSolAddress
		}));

		const splMainnetAccounts: { SplMainnet: AccountSnapshot_Spl }[] = [
			{
				SplMainnet: {
					decimals: SOLANA_TOKEN.decimals,
					approx_usd_per_token: mockTokens.length + 3,
					amount: mockSplAmount * 5n,
					timestamp: nowNanoseconds,
					network: {},
					account: mockSolAddress,
					token_address: 'So11111111111111111111111111111111111111111',
					last_transactions: []
				}
			},
			{
				SplMainnet: {
					decimals: mockValidSplToken.decimals,
					approx_usd_per_token: mockTokens.length + 4,
					amount: mockSplAmount,
					timestamp: nowNanoseconds,
					network: {},
					account: mockSolAddress,
					token_address: mockValidSplToken.address,
					last_transactions: mockSolTransactions.slice(0, 5).map(
						({ value, timestamp, to }: SolTransactionUi): Transaction_Spl => ({
							transaction_type: { Send: null },
							timestamp: (timestamp ?? 0n) * NANO_SECONDS_IN_MILLISECOND,
							amount: value ?? 0n,
							network: {},
							counterparty: to ?? ''
						})
					)
				}
			}
		];

		const userSnapshot: UserSnapshot = {
			accounts: [...icrcAccounts, ...splMainnetAccounts],
			timestamp: toNullable(nowNanoseconds)
		};

		const mockExchangesData: ExchangesData = tokens.reduce<ExchangesData>(
			(acc, { id }, idx) => ({
				...acc,
				[id]: { usd: 1 + idx }
			}),
			{}
		);

		const mockAuthStore = (value: Identity | null = mockIdentity) =>
			vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

		beforeEach(() => {
			vi.resetAllMocks();
			vi.restoreAllMocks();
			vi.clearAllMocks();

			vi.useFakeTimers().setSystemTime(now);

			vi.spyOn(airdropEnv, 'USER_SNAPSHOT_ENABLED', 'get').mockImplementationOnce(() => true);

			mockAuthStore();

			vi.spyOn(tokensDerived, 'tokens', 'get').mockImplementation(() => readable(tokens));

			vi.spyOn(addressStore, 'solAddressMainnet', 'get').mockImplementation(() =>
				readable(mockSolAddress)
			);

			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
				icTransactionsStore.reset(id);
				solTransactionsStore.reset(id);
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
				tokenId: SOLANA_TOKEN.id,
				data: { data: BigNumber.from(mockSplAmount * 5n), certified }
			});
			balancesStore.set({
				tokenId: mockValidIcToken.id,
				data: { data: BigNumber.from(mockIcAmount), certified }
			});
			balancesStore.set({
				tokenId: mockValidSplToken.id,
				data: { data: BigNumber.from(mockSplAmount), certified }
			});

			icTransactionsStore.prepend({
				tokenId: ICP_TOKEN.id,
				transactions: mockIcTransactions.map((transaction) => ({
					data: transaction,
					certified
				}))
			});
			solTransactionsStore.prepend({
				tokenId: mockValidSplToken.id,
				transactions: mockSolTransactions.map((transaction) => ({
					data: transaction,
					certified
				}))
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
				userSnapshot: {
					...userSnapshot,
					accounts: [...icrcAccounts.slice(0, 1), ...splMainnetAccounts]
				},
				identity: mockIdentity
			});
		});
	});
});
