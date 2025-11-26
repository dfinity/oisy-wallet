import type {
	AccountSnapshot_Any,
	Transaction_Any,
	UserSnapshot
} from '$declarations/rewards/rewards.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { ICRC_LEDGER_CANISTER_TESTNET_IDS } from '$env/networks/networks.icrc.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { ETH_TOKEN_GROUP_ID } from '$env/tokens/groups/groups.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCkToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { registerAirdropRecipient } from '$lib/api/reward.api';
import {
	NANO_SECONDS_IN_MILLISECOND,
	NANO_SECONDS_IN_SECOND,
	ZERO
} from '$lib/constants/app.constants';
import * as addressStore from '$lib/derived/address.derived';
import * as authStore from '$lib/derived/auth.derived';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
import * as balancesStores from '$lib/stores/balances.store';
import { balancesStore, type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import type { WritableUpdateStore } from '$lib/stores/certified.store';
import { nftStore } from '$lib/stores/nft.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Nft } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { readable } from 'svelte/store';

vi.mock('$lib/api/reward.api', () => ({
	registerAirdropRecipient: vi.fn()
}));

describe('user-snapshot.services', () => {
	describe('registerUserSnapshot', () => {
		const certified = false;

		const now = Date.now();
		const nowNanoseconds = BigInt(now) * NANO_SECONDS_IN_MILLISECOND;

		const mockIcrcTestnetToken: IcCkToken = {
			...mockValidIcCkToken,
			id: parseTokenId('IcrcTestnetTokenId'),
			ledgerCanisterId: ICRC_LEDGER_CANISTER_TESTNET_IDS[0]
		};

		const tokens: Token[] = [
			...mockTokens,
			mockValidIcToken,
			mockIcrcTestnetToken,
			mockValidErc20Token,
			SOLANA_TOKEN,
			mockValidSplToken
		];

		// Required for the type interpreter
		assertNonNullish(ICP_NETWORK_ID.description);
		assertNonNullish(ICP_TOKEN_ID.description);
		assertNonNullish(mockValidIcToken.id.description);
		assertNonNullish(mockIcrcTestnetToken.id.description);
		assertNonNullish(SOLANA_MAINNET_NETWORK_ID.description);
		assertNonNullish(SOLANA_TOKEN_ID.description);
		assertNonNullish(mockValidSplToken.id.description);
		assertNonNullish(ETHEREUM_NETWORK_ID.description);
		assertNonNullish(ETHEREUM_TOKEN_ID.description);

		const mockIcAmount = 123456n;
		const mockSolAmount = 987654n;
		const mockEthAmount = mockIcAmount + mockSolAmount;

		const mockIcTransactions: IcTransactionUi[] = createMockIcTransactionsUi(7).map((tx) => ({
			...tx,
			from: mockPrincipalText
		}));

		const icpAccount: { Any: AccountSnapshot_Any }[] = [
			{
				Any: {
					decimals: ICP_TOKEN.decimals,
					approx_usd_per_token: 1,
					amount: mockIcAmount * 2n,
					timestamp: nowNanoseconds,
					network: {
						testnet_for: toNullable(),
						network_id: ICP_NETWORK_ID.description
					},
					account: mockIdentity.getPrincipal().toString(),
					token_address: { token_symbol: ICP_TOKEN_ID.description, wraps: toNullable() },
					last_transactions: mockIcTransactions
						.slice(0, 5)
						.map(({ value, timestamp, to }: IcTransactionUi): Transaction_Any => {
							// Required for the type interpreter
							assertNonNullish(ICP_NETWORK_ID.description);

							return {
								transaction_type: { Send: null },
								timestamp: BigInt(
									normalizeTimestampToSeconds(timestamp ?? ZERO) * Number(NANO_SECONDS_IN_SECOND)
								),
								amount: value ?? ZERO,
								network: {
									testnet_for: toNullable(),
									network_id: ICP_NETWORK_ID.description
								},
								counterparty: to ?? Principal.anonymous().toString()
							};
						})
				}
			}
		];

		const icrcAccounts: { Any: AccountSnapshot_Any }[] = [
			{
				Any: {
					decimals: mockValidIcToken.decimals,
					approx_usd_per_token: mockTokens.length + 1,
					amount: mockIcAmount,
					timestamp: nowNanoseconds,
					network: {
						testnet_for: toNullable(),
						network_id: ICP_NETWORK_ID.description
					},
					account: mockIdentity.getPrincipal().toString(),
					token_address: { token_symbol: mockValidIcToken.id.description, wraps: toNullable() },
					last_transactions: []
				}
			},
			{
				Any: {
					decimals: mockIcrcTestnetToken.decimals,
					approx_usd_per_token: mockTokens.length + 2,
					amount: mockIcAmount * 10n,
					timestamp: nowNanoseconds,
					network: {
						testnet_for: toNullable('true'),
						network_id: ICP_NETWORK_ID.description
					},
					account: mockIdentity.getPrincipal().toString(),
					token_address: {
						token_symbol: mockIcrcTestnetToken.id.description,
						wraps: toNullable()
					},
					last_transactions: []
				}
			}
		];

		const mockSolTransactions: SolTransactionUi[] = createMockSolTransactionsUi(13).map((tx) => ({
			...tx,
			from: mockSolAddress
		}));

		const solMainnetAccounts: { Any: AccountSnapshot_Any }[] = [
			{
				Any: {
					decimals: SOLANA_TOKEN.decimals,
					approx_usd_per_token: mockTokens.length + 4,
					amount: mockSolAmount * 5n,
					timestamp: nowNanoseconds,
					network: {
						testnet_for: toNullable(),
						network_id: SOLANA_MAINNET_NETWORK_ID.description
					},
					account: mockSolAddress,
					token_address: { token_symbol: SOLANA_TOKEN_ID.description, wraps: toNullable() },
					last_transactions: []
				}
			},
			{
				Any: {
					decimals: mockValidSplToken.decimals,
					approx_usd_per_token: mockTokens.length + 5,
					amount: mockSolAmount,
					timestamp: nowNanoseconds,
					network: {
						testnet_for: toNullable(),
						network_id: SOLANA_MAINNET_NETWORK_ID.description
					},
					account: mockSolAddress,
					token_address: { token_symbol: mockValidSplToken.id.description, wraps: toNullable() },
					last_transactions: mockSolTransactions
						.slice(0, 5)
						.map(({ value, timestamp, to }: SolTransactionUi): Transaction_Any => {
							// Required for the type interpreter
							assertNonNullish(SOLANA_MAINNET_NETWORK_ID.description);

							return {
								transaction_type: { Send: null },
								timestamp: BigInt(
									normalizeTimestampToSeconds(timestamp ?? ZERO) * Number(NANO_SECONDS_IN_SECOND)
								),
								amount: value ?? ZERO,
								network: {
									testnet_for: toNullable(),
									network_id: SOLANA_MAINNET_NETWORK_ID.description
								},
								counterparty: to ?? ''
							};
						})
				}
			}
		];

		const ethMainnetAccounts: { Any: AccountSnapshot_Any }[] = [
			{
				Any: {
					decimals: ETHEREUM_TOKEN.decimals,
					approx_usd_per_token: mockTokens.length,
					amount: mockEthAmount,
					timestamp: nowNanoseconds,
					network: {
						testnet_for: toNullable(),
						network_id: ETHEREUM_NETWORK_ID.description
					},
					account: mockEthAddress,
					token_address: {
						token_symbol: ETHEREUM_TOKEN_ID.description,
						wraps: toNullable(ETH_TOKEN_GROUP_ID.description)
					},
					last_transactions: []
				}
			}
		];

		const userSnapshot: UserSnapshot = {
			accounts: [
				...icpAccount,
				...ethMainnetAccounts,
				...icrcAccounts.slice(0, 1),
				...solMainnetAccounts
			],
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

			mockAuthStore();

			vi.spyOn(tokensUiDerived, 'tokens', 'get').mockImplementation(() => readable(tokens));

			vi.spyOn(addressStore, 'solAddressMainnet', 'get').mockImplementation(() =>
				readable(mockSolAddress)
			);
			vi.spyOn(addressStore, 'ethAddress', 'get').mockImplementation(() =>
				readable(mockEthAddress)
			);

			nftStore.resetAll();

			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
				icTransactionsStore.reset(id);
				solTransactionsStore.reset(id);
			});

			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: mockIcAmount * 2n, certified }
			});
			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: mockEthAmount, certified }
			});
			balancesStore.set({
				id: SOLANA_TOKEN.id,
				data: { data: mockSolAmount * 5n, certified }
			});
			balancesStore.set({
				id: mockValidIcToken.id,
				data: { data: mockIcAmount, certified }
			});
			balancesStore.set({
				id: mockValidSplToken.id,
				data: { data: mockSolAmount, certified }
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
			vi.spyOn(tokensUiDerived, 'tokens', 'get').mockImplementationOnce(() => readable([]));

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

		it('should send exchange rate 0 if no exchange rates are found', async () => {
			vi.spyOn(exchangeDerived, 'exchanges', 'get').mockImplementation(() => readable({}));

			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot: {
					...userSnapshot,
					accounts: [
						{ Any: { ...icpAccount[0].Any, approx_usd_per_token: 0 } },
						{ Any: { ...ethMainnetAccounts[0].Any, approx_usd_per_token: 0 } },
						{ Any: { ...icrcAccounts[0].Any, approx_usd_per_token: 0 } },
						{ Any: { ...solMainnetAccounts[0].Any, approx_usd_per_token: 0 } },
						{ Any: { ...solMainnetAccounts[1].Any, approx_usd_per_token: 0 } }
					]
				},
				identity: mockIdentity
			});
		});

		it('should handle multiple tokens and send correct snapshots', async () => {
			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot,
				identity: mockIdentity
			});
		});

		it('should include ICRC testnet tokens', async () => {
			balancesStore.set({
				id: mockIcrcTestnetToken.id,
				data: { data: mockIcAmount * 10n, certified }
			});

			const userSnapshot: UserSnapshot = {
				accounts: [...icpAccount, ...ethMainnetAccounts, ...icrcAccounts, ...solMainnetAccounts],
				timestamp: toNullable(nowNanoseconds)
			};

			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot,
				identity: mockIdentity
			});
		});

		it('should not include tokens with zero balance', async () => {
			balancesStore.set({
				id: mockIcrcTestnetToken.id,
				data: { data: ZERO, certified }
			});
			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: ZERO, certified }
			});

			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot: {
					...userSnapshot,
					accounts: [...icpAccount, ...icrcAccounts.slice(0, 1), ...solMainnetAccounts]
				},
				identity: mockIdentity
			});
		});

		it('should customize the symbol for NFTs', async () => {
			const mockNft1: Nft = {
				...mockValidErc721Nft,
				collection: mockValidErc721Token
			};

			const mockNft2: Nft = {
				...mockValidErc721Nft,
				id: parseNftId('12632'),
				collection: mockValidErc721Token
			};

			const mockNft3: Nft = {
				...mockValidErc1155Nft,
				id: parseNftId('843764'),
				collection: mockValidErc1155Token
			};

			const mockNfts = [mockNft1, mockNft2, mockNft3];

			nftStore.addAll(mockNfts);

			const mockTokens = [
				mockValidErc721Token,
				{ ...mockValidErc1155Token, section: CustomTokenSection.HIDDEN }
			];

			const expectedAccounts: { Any: AccountSnapshot_Any }[] = [
				{
					Any: {
						decimals: mockValidErc721Token.decimals,
						approx_usd_per_token: 0,
						amount: 2n,
						timestamp: nowNanoseconds,
						network: {
							testnet_for: toNullable(),
							network_id: `${mockValidErc721Token.network.id.description}`
						},
						account: mockEthAddress,
						token_address: {
							token_symbol: `nft#${mockValidErc721Token.name}#${mockValidErc721Token.address}#`,
							wraps: toNullable()
						},
						last_transactions: []
					}
				},
				{
					Any: {
						decimals: mockValidErc1155Token.decimals,
						approx_usd_per_token: 0,
						amount: 1n,
						timestamp: nowNanoseconds,
						network: {
							testnet_for: toNullable(),
							network_id: `${mockValidErc1155Token.network.id.description}`
						},
						account: mockEthAddress,
						token_address: {
							token_symbol: `nft#${mockValidErc1155Token.name}#${mockValidErc1155Token.address}#${CustomTokenSection.HIDDEN}`,
							wraps: toNullable()
						},
						last_transactions: []
					}
				}
			];

			const userSnapshot: UserSnapshot = {
				accounts: [...icpAccount, ...ethMainnetAccounts, ...icrcAccounts, ...solMainnetAccounts],
				timestamp: toNullable(nowNanoseconds)
			};

			vi.spyOn(tokensUiDerived, 'tokens', 'get').mockImplementation(() => readable(mockTokens));

			await registerUserSnapshot();

			expect(registerAirdropRecipient).toHaveBeenCalledWith({
				userSnapshot: {
					...userSnapshot,
					accounts: expectedAccounts
				},
				identity: mockIdentity
			});
		});
	});
});
