import { sendBtc } from '$btc/services/btc-send.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BtcBroadcastUnconfirmedError, BtcPrepareSendError } from '$btc/types/btc-send';
import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import type { MinterInfo as CkSolMinterInfo } from '$declarations/cksol_minter/cksol_minter.did';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import {
	IC_CKSOL_LEDGER_CANISTER_ID,
	IC_CKSOL_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { send as sendEth } from '$eth/services/send.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { estimateFee } from '$icp/api/ckbtc-minter.api';
import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { minterInfo as ckSolMinterInfo, watchDepositAddress } from '$icp/api/cksol-minter.api';
import { CkSolWatchDepositAddressError } from '$icp/canisters/cksol-minter.errors';
import { loadCkSolDepositAddress } from '$icp/services/cksol-deposit.services';
import { sendIc } from '$icp/services/ic-send.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcCkWithdrawalResult } from '$icp/types/ic-send';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendSol, ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	deleteUnbroadcastActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	fetchChainFusionBtcQuote,
	fetchChainFusionBtcSwap,
	fetchChainFusionEvmQuote,
	fetchChainFusionEvmSwap,
	fetchChainFusionIcpQuote,
	fetchChainFusionIcpSwap,
	fetchChainFusionSolQuote,
	fetchChainFusionSolSwap
} from '$lib/services/chain-fusion-swap.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { ChainFusionSolDepositRefusedError } from '$lib/types/errors';
import {
	SwapProvider,
	type BtcQuoteParams,
	type ChainFusionSwapDetails,
	type EvmQuoteParams,
	type IcpBridgeQuoteParams,
	type NearIntentsQuoteParams,
	type SwapQuoteObserver
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { getSolBalance, isBlockhashValid } from '$sol/api/solana.api';
import { sendSol } from '$sol/services/sol-send.services';
import { SolanaNetworks } from '$sol/types/network';
import { mockChainFusionActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockValidIcCkToken,
	mockValidIcrcToken,
	mockValidIcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mockPreflightContext } from '$tests/mocks/sol-error.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { nonNullish, toNullable } from '@dfinity/utils';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import {
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY,
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
	SolanaError
} from '@solana/kit';

let mockEnabled = true;

vi.mock('$env/chain-fusion-swap.env', () => ({
	get CHAIN_FUSION_SWAP_ENABLED() {
		return mockEnabled;
	}
}));

vi.mock('$icp/api/cketh-minter.api', () => ({
	eip1559TransactionPrice: vi.fn()
}));

vi.mock('$icp/api/ckbtc-minter.api', () => ({
	estimateFee: vi.fn()
}));

vi.mock('$icp/api/cksol-minter.api', () => ({
	minterInfo: vi.fn(),
	watchDepositAddress: vi.fn()
}));

vi.mock('$icp/services/cksol-deposit.services', () => ({
	loadCkSolDepositAddress: vi.fn()
}));

vi.mock('$sol/api/solana.api', () => ({
	getSolBalance: vi.fn(),
	isBlockhashValid: vi.fn()
}));

vi.mock('$sol/services/sol-send.services', () => ({
	sendSol: vi.fn()
}));

// The quote's UTXO selection is a pure function of three stores; stubbing it keeps these
// cases about what the quote does with the result rather than about UTXO arithmetic, which
// `btc-utxos.utils` covers on its own.
vi.mock('$btc/services/btc-utxos.service', () => ({
	prepareBtcSend: vi.fn()
}));

vi.mock('$btc/services/btc-send.services', () => ({
	sendBtc: vi.fn()
}));

vi.mock('$icp/services/ic-send.services', () => ({
	sendIc: vi.fn()
}));

vi.mock('$eth/services/send.services', () => ({
	send: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	deleteUnbroadcastActiveUserTransaction: vi.fn()
}));

const IC_CKETH_LEDGER = 'ss2fx-dyaaa-aaaar-qacoq-cai';
const IC_CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';
const LOCAL_CKUSDC_LEDGER = 'yfumr-cyaaa-aaaar-qaela-cai';
const IC_CKBTC_LEDGER = IC_CKBTC_LEDGER_CANISTER_ID;

const MAX_TRANSACTION_FEE = 500_000n;
const CKETH_LEDGER_FEE = 2_000n;
const CK_LEDGER_FEE = 123n;
const BITCOIN_FEE = 3_000n;
const MINTER_FEE = 1_500n;

// The minter's per-user deposit address, which is not the user's own address.
const mockBtcDepositAddress = 'bc1qmintersuppliedaddressforthedepositleg00000000';

const AMOUNT = 1_000_000n;

const SWAP_ID = '11111111-1111-4111-8111-111111111111';
const MINTER_CANISTER_ID = 'sv3dd-oaaaa-aaaar-qacoa-cai';

// The wire format is a sorted `(key, value)` array; assertions read better keyed.
const refsOfLastCreate = (): Record<string, string> =>
	Object.fromEntries(
		(vi.mocked(createActiveUserTransaction).mock.lastCall?.[0].externalRefs ?? []).map(
			({ key, value }) => [key, value]
		)
	);

const makeCkToken = ({
	ledgerCanisterId,
	twinToken,
	symbol
}: {
	ledgerCanisterId: string;
	twinToken: Token;
	symbol: string;
}): IcCkToken => ({
	...mockValidIcCkToken,
	id: parseTokenId(symbol),
	symbol,
	ledgerCanisterId,
	twinToken
});

const ckEthToken = makeCkToken({
	ledgerCanisterId: IC_CKETH_LEDGER,
	twinToken: ETHEREUM_TOKEN,
	symbol: 'ckETH'
});

const ckUsdcToken = makeCkToken({
	ledgerCanisterId: IC_CKUSDC_LEDGER,
	twinToken: USDC_TOKEN,
	symbol: 'ckUSDC'
});

const quote = (
	params: SwapQuoteObserver &
		Partial<{ sourceToken: Token; destinationToken: Token; amount: bigint }>
) =>
	fetchChainFusionEvmQuote({
		sourceToken: ETHEREUM_TOKEN,
		destinationToken: ckEthToken,
		amount: AMOUNT,
		userAddress: undefined,
		slippage: 0,
		...params
	} as unknown as EvmQuoteParams);

const setMinterInfo = ({
	data = {},
	certified = true
}: { data?: Partial<typeof mockCkMinterInfo>; certified?: boolean } = {}) => {
	ckEthMinterInfoStore.set({
		id: ETHEREUM_TOKEN_ID,
		data: { data: { ...mockCkMinterInfo, ...data }, certified }
	});
};

describe('chain-fusion-swap.services', () => {
	describe('fetchChainFusionEvmQuote', () => {
		beforeEach(() => {
			mockEnabled = true;
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN_ID);
			setMinterInfo();
		});

		it('reports local mint pricing only after the helper prerequisites are available', async () => {
			const onProviderParticipating = vi.fn();
			await quote({ onProviderParticipating });

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.CHAIN_FUSION);

			onProviderParticipating.mockClear();
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN_ID);
			await quote({ onProviderParticipating });

			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('should quote ETH to ckETH one to one, with no fee deducted', async () => {
			await expect(quote({})).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT,
				swapDetails: { sourceFees: [], externalFees: [] }
			});
		});

		it('should quote an ERC20 to its ckERC20 one to one', async () => {
			await expect(
				quote({ sourceToken: USDC_TOKEN, destinationToken: ckUsdcToken })
			).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT,
				swapDetails: { sourceFees: [], externalFees: [] }
			});
		});

		it('should not quote a same-symbol ERC20 from another EVM network', async () => {
			await expect(
				quote({ sourceToken: BASE_USDC_TOKEN, destinationToken: ckUsdcToken })
			).resolves.toBeUndefined();
		});

		it('should not quote native ETH from another EVM network', async () => {
			await expect(
				quote({ sourceToken: BASE_ETH_TOKEN, destinationToken: ckEthToken })
			).resolves.toBeUndefined();
		});

		it('should not quote a mismatched ck pair', async () => {
			await expect(
				quote({ sourceToken: ETHEREUM_TOKEN, destinationToken: ckUsdcToken })
			).resolves.toBeUndefined();
		});

		it('should not quote when the destination is not a ck token', async () => {
			await expect(quote({ destinationToken: mockValidIcrcToken })).resolves.toBeUndefined();
		});

		it('should not quote when the minter info is absent', async () => {
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN_ID);

			await expect(quote({})).resolves.toBeUndefined();
		});

		it('should not quote ETH when the ckETH helper contract address is missing', async () => {
			setMinterInfo({ data: { eth_helper_contract_address: toNullable<string>() } });

			await expect(quote({})).resolves.toBeUndefined();
		});

		it('should not quote an ERC20 when the ckERC20 helper contract address is missing', async () => {
			setMinterInfo({ data: { erc20_helper_contract_address: toNullable<string>() } });

			await expect(
				quote({ sourceToken: USDC_TOKEN, destinationToken: ckUsdcToken })
			).resolves.toBeUndefined();
		});

		it('should still quote ETH when only the ckERC20 helper contract address is missing', async () => {
			setMinterInfo({ data: { erc20_helper_contract_address: toNullable<string>() } });

			await expect(quote({})).resolves.toEqual(
				expect.objectContaining({ provider: SwapProvider.CHAIN_FUSION })
			);
		});

		it('should not quote when the flag is off', async () => {
			mockEnabled = false;

			await expect(quote({})).resolves.toBeUndefined();
		});
	});

	describe('fetchChainFusionIcpQuote', () => {
		const ckEthLedgerToken: IcToken = {
			...mockValidIcToken,
			id: parseTokenId('ckETH-ledger'),
			symbol: 'ckETH',
			ledgerCanisterId: IC_CKETH_LEDGER,
			fee: CKETH_LEDGER_FEE
		};

		const ckEthSource = makeCkToken({
			ledgerCanisterId: IC_CKETH_LEDGER,
			twinToken: ETHEREUM_TOKEN,
			symbol: 'ckETH-source'
		});

		const ckUsdcSource: IcCkToken = {
			...makeCkToken({
				ledgerCanisterId: LOCAL_CKUSDC_LEDGER,
				twinToken: USDC_TOKEN,
				symbol: 'ckUSDC-source'
			}),
			feeLedgerCanisterId: IC_CKETH_LEDGER
		};

		const icpQuote = (
			params: SwapQuoteObserver & Partial<{ sourceToken: Token; destinationToken: Token }>
		) =>
			fetchChainFusionIcpQuote({
				sourceToken: ckEthSource,
				destinationToken: ETHEREUM_TOKEN,
				amount: AMOUNT,
				userEthAddress: undefined,
				slippage: 0,
				...params
			} as IcpBridgeQuoteParams);

		beforeEach(() => {
			mockEnabled = true;
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN_ID);
			setMinterInfo();

			icrcDefaultTokensStore.resetAll();
			icrcDefaultTokensStore.set({ data: ckEthLedgerToken, certified: true });

			vi.mocked(eip1559TransactionPrice).mockResolvedValue({
				max_transaction_fee: MAX_TRANSACTION_FEE,
				max_priority_fee_per_gas: 1n,
				max_fee_per_gas: 1n,
				gas_limit: 1n,
				timestamp: toNullable(1n)
			});
		});

		it('reports each eligible ETH-family withdrawal pricing entry, not missing minters', async () => {
			const onProviderParticipating = vi.fn();
			await icpQuote({ onProviderParticipating });
			await icpQuote({
				sourceToken: ckUsdcSource,
				destinationToken: USDC_TOKEN,
				onProviderParticipating
			});

			expect(onProviderParticipating.mock.calls).toEqual([
				[SwapProvider.CHAIN_FUSION],
				[SwapProvider.CHAIN_FUSION]
			]);

			onProviderParticipating.mockClear();
			await icpQuote({
				sourceToken: { ...ckEthSource, minterCanisterId: undefined } as IcCkToken,
				onProviderParticipating
			});
			await icpQuote({
				sourceToken: { ...ckUsdcSource, feeLedgerCanisterId: undefined } as IcCkToken,
				destinationToken: USDC_TOKEN,
				onProviderParticipating
			});

			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('should quote a ckETH withdrawal 1:1 with both fees itemized, like the Convert flow', async () => {
			await expect(icpQuote({})).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT,
				swapDetails: {
					sourceFees: [
						{ labelPath: 'fee.text.fee', fee: CK_LEDGER_FEE, token: ckEthSource },
						{
							labelPath: 'fee.text.estimated_eth',
							fee: MAX_TRANSACTION_FEE,
							token: ckEthSource
						}
					],
					externalFees: [],
					minimumAmount: 100n,
					minterInfoCertified: true
				}
			});
		});

		it('should flag a ckETH withdrawal quoted off an uncertified minter info read', async () => {
			setMinterInfo({ certified: false });

			const result = await icpQuote({});

			expect(
				(result as { swapDetails: { minterInfoCertified?: boolean } }).swapDetails
					.minterInfoCertified
			).toBeFalsy();
		});

		it('should query the ETH withdrawal price without a ckERC20 ledger id', async () => {
			await icpQuote({});

			expect(eip1559TransactionPrice).toHaveBeenCalledWith(
				expect.not.objectContaining({ ckErc20LedgerId: expect.anything() })
			);
		});

		it('should charge a ckERC20 withdrawal its gas in ckETH, not in the source token', async () => {
			const result = await icpQuote({
				sourceToken: ckUsdcSource,
				destinationToken: USDC_TOKEN
			});

			expect(result).toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT,
				swapDetails: {
					sourceFees: [{ labelPath: 'fee.text.fee', fee: CK_LEDGER_FEE, token: ckUsdcSource }],
					externalFees: [
						{
							labelPath: 'fee.text.estimated_eth',
							fee: MAX_TRANSACTION_FEE + CKETH_LEDGER_FEE,
							token: expect.objectContaining({ ledgerCanisterId: IC_CKETH_LEDGER })
						}
					]
				}
			});
		});

		it('should not apply a minter minimum to a ckERC20 withdrawal', async () => {
			const result = await icpQuote({
				sourceToken: ckUsdcSource,
				destinationToken: USDC_TOKEN
			});

			expect(result).toBeDefined();
			expect(
				(result as { swapDetails: { minimumAmount?: bigint } }).swapDetails.minimumAmount
			).toBeUndefined();
		});

		it('should pass the ckERC20 ledger id when pricing an ERC20 withdrawal', async () => {
			await icpQuote({ sourceToken: ckUsdcSource, destinationToken: USDC_TOKEN });

			expect(eip1559TransactionPrice).toHaveBeenCalledWith(
				expect.objectContaining({
					ckErc20LedgerId: expect.objectContaining({
						toText: expect.any(Function)
					})
				})
			);
		});

		it('should reject a testnet ck pair whose twin check would otherwise pass', async () => {
			const ckSepoliaEth = makeCkToken({
				ledgerCanisterId: IC_CKETH_LEDGER,
				twinToken: SEPOLIA_TOKEN,
				symbol: 'ckSepoliaETH'
			});

			await expect(
				icpQuote({ sourceToken: ckSepoliaEth, destinationToken: SEPOLIA_TOKEN })
			).resolves.toBeUndefined();
		});

		it('should not quote a mismatched ck pair', async () => {
			await expect(icpQuote({ destinationToken: USDC_TOKEN })).resolves.toBeUndefined();
		});

		it('should not quote an IC token that is not a ck ledger', async () => {
			await expect(icpQuote({ sourceToken: mockValidIcrcToken })).resolves.toBeUndefined();
		});

		it('should not quote a ckETH withdrawal when the minter info is absent', async () => {
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN_ID);

			await expect(icpQuote({})).resolves.toBeUndefined();
		});

		it('should not quote a ckERC20 withdrawal when the ckETH fee ledger is unknown', async () => {
			icrcDefaultTokensStore.resetAll();

			await expect(
				icpQuote({ sourceToken: ckUsdcSource, destinationToken: USDC_TOKEN })
			).resolves.toBeUndefined();
		});

		it('should not quote when the minter price query fails', async () => {
			vi.mocked(eip1559TransactionPrice).mockRejectedValue(new Error('minter unreachable'));

			await expect(icpQuote({})).resolves.toBeUndefined();
		});

		it('should quote a ckERC20 withdrawal one to one', async () => {
			const result = await icpQuote({
				sourceToken: ckUsdcSource,
				destinationToken: USDC_TOKEN
			});

			expect((result as { receiveAmount: bigint }).receiveAmount).toBe(AMOUNT);
		});

		it('should not quote when the flag is off', async () => {
			mockEnabled = false;

			await expect(icpQuote({})).resolves.toBeUndefined();
		});
	});

	describe('fetchChainFusionIcpSwap', () => {
		const progress = vi.fn();

		const ckEthLedgerToken: IcToken = {
			...mockValidIcToken,
			id: parseTokenId('ckETH-swap-ledger'),
			symbol: 'ckETH',
			ledgerCanisterId: IC_CKETH_LEDGER,
			fee: CKETH_LEDGER_FEE
		};

		const ckEthSource = makeCkToken({
			ledgerCanisterId: IC_CKETH_LEDGER,
			twinToken: ETHEREUM_TOKEN,
			symbol: 'ckETH-swap-source'
		});

		const ckUsdcSource: IcCkToken = {
			...makeCkToken({
				ledgerCanisterId: LOCAL_CKUSDC_LEDGER,
				twinToken: USDC_TOKEN,
				symbol: 'ckUSDC-swap-source'
			}),
			feeLedgerCanisterId: IC_CKETH_LEDGER
		};

		const swapParams = {
			identity: mockIdentity,
			progress,
			swapAmount: '1',
			destinationAddress: mockEthAddress,
			swapId: SWAP_ID
		};

		// The real `sendIc` hands the result over the moment the burn is registered,
		// ahead of its wallet-refresh wait.
		const mockSendIc = (result: IcCkWithdrawalResult) =>
			vi.mocked(sendIc).mockImplementation(async ({ onSent }) => {
				await onSent?.({ result });
				return result;
			});

		beforeEach(() => {
			vi.clearAllMocks();

			icrcDefaultTokensStore.resetAll();
			icrcDefaultTokensStore.set({ data: ckEthLedgerToken, certified: true });

			vi.mocked(eip1559TransactionPrice).mockResolvedValue({
				max_transaction_fee: MAX_TRANSACTION_FEE,
				max_priority_fee_per_gas: 1n,
				max_fee_per_gas: 1n,
				gas_limit: 1n,
				timestamp: toNullable(1n)
			});
		});

		it('should approve a freshly queried ckETH fee for a ckERC20 withdrawal', async () => {
			mockSendIc({
				type: 'ckErc20ToErc20',
				ckEthBlockIndex: 1n,
				ckErc20BlockIndex: 2n
			});

			await fetchChainFusionIcpSwap({
				...swapParams,
				sourceToken: ckUsdcSource,
				destinationToken: USDC_TOKEN
			});

			expect(eip1559TransactionPrice).toHaveBeenCalledOnce();
			expect(sendIc).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					ckErc20ToErc20MaxCkEthFees: MAX_TRANSACTION_FEE + CKETH_LEDGER_FEE
				})
			);
		});

		it('should approve no ckETH fee for a ckETH withdrawal, without a price round-trip', async () => {
			mockSendIc({ type: 'ckEthToEth', blockIndex: 1n });

			await fetchChainFusionIcpSwap({
				...swapParams,
				sourceToken: ckEthSource,
				destinationToken: ETHEREUM_TOKEN
			});

			expect(eip1559TransactionPrice).not.toHaveBeenCalled();
			expect(sendIc).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ ckErc20ToErc20MaxCkEthFees: undefined })
			);
		});

		it('should surface the withdrawal result sendIc returns', async () => {
			const result = { type: 'ckEthToEth', blockIndex: 7n } as const;

			mockSendIc(result);

			await expect(
				fetchChainFusionIcpSwap({
					...swapParams,
					sourceToken: ckEthSource,
					destinationToken: ETHEREUM_TOKEN
				})
			).resolves.toStrictEqual(result);
		});

		it('should create an active user transaction keyed on the ckETH burn index', async () => {
			mockSendIc({ type: 'ckEthToEth', blockIndex: 7n });

			await fetchChainFusionIcpSwap({
				...swapParams,
				sourceToken: { ...ckEthSource, minterCanisterId: MINTER_CANISTER_ID },
				destinationToken: ETHEREUM_TOKEN,
				usdSourceValue: '3000'
			});

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					id: SWAP_ID,
					data: {
						ChainFusion: {
							direction: { CkEthToEth: null },
							source_token: { Icrc: Principal.fromText(IC_CKETH_LEDGER) },
							dest_token: { EvmNative: 1n },
							// `swapAmount: '1'` in the *source* token's base units.
							amount: 10n ** BigInt(ckEthSource.decimals)
						}
					}
				})
			);

			expect(refsOfLastCreate()).toStrictEqual(
				expect.objectContaining({
					chain_fusion_cketh_index: '7',
					chain_fusion_minter_id: MINTER_CANISTER_ID,
					amount: '1',
					usd_source_value: '3000',
					source_token_symbol: 'ckETH-swap-source',
					destination_token_symbol: ETHEREUM_TOKEN.symbol
				})
			);

			expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_ckerc20_index');
		});

		it('should key a ckERC20 withdrawal on its ckETH burn index and carry the ckERC20 one', async () => {
			mockSendIc({
				type: 'ckErc20ToErc20',
				ckEthBlockIndex: 11n,
				ckErc20BlockIndex: 12n
			});

			await fetchChainFusionIcpSwap({
				...swapParams,
				sourceToken: { ...ckUsdcSource, minterCanisterId: MINTER_CANISTER_ID },
				destinationToken: USDC_TOKEN
			});

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					data: expect.objectContaining({
						ChainFusion: expect.objectContaining({ direction: { CkErc20ToErc20: null } })
					})
				})
			);

			expect(refsOfLastCreate()).toStrictEqual(
				expect.objectContaining({
					chain_fusion_cketh_index: '11',
					chain_fusion_ckerc20_index: '12'
				})
			);
		});

		it('should key a ckBTC withdrawal on its retrieve_btc block index', async () => {
			mockSendIc({ type: 'ckBtcToBtc', blockIndex: 42n });

			const ckBtcSource = makeCkToken({
				ledgerCanisterId: IC_CKBTC_LEDGER,
				twinToken: BTC_MAINNET_TOKEN,
				symbol: 'ckBTC-source'
			});

			await fetchChainFusionIcpSwap({
				...swapParams,
				sourceToken: { ...ckBtcSource, minterCanisterId: MINTER_CANISTER_ID },
				destinationToken: BTC_MAINNET_TOKEN,
				destinationAddress: mockBtcAddress
			});

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					data: {
						ChainFusion: {
							direction: { CkBtcToBtc: null },
							source_token: { Icrc: Principal.fromText(IC_CKBTC_LEDGER) },
							dest_token: { BtcNativeMainnet: null },
							amount: 10n ** BigInt(ckBtcSource.decimals)
						}
					}
				})
			);

			expect(refsOfLastCreate()).toStrictEqual(
				expect.objectContaining({
					chain_fusion_retrieve_btc_index: '42',
					chain_fusion_minter_id: MINTER_CANISTER_ID
				})
			);

			// The ckETH minter has nothing to do with this withdrawal.
			expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_cketh_index');
		});

		it('should key a ckSOL withdrawal on its withdraw_sol burn index', async () => {
			mockSendIc({ type: 'ckSolToSol', blockIndex: 9n });

			const ckSolSource = makeCkToken({
				ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
				twinToken: SOLANA_TOKEN,
				symbol: 'ckSOL-source'
			});

			await fetchChainFusionIcpSwap({
				...swapParams,
				sourceToken: { ...ckSolSource, minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID },
				destinationToken: SOLANA_TOKEN,
				destinationAddress: mockSolAddress
			});

			expect(sendIc).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					to: mockSolAddress,
					targetNetworkId: SOLANA_TOKEN.network.id
				})
			);

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					data: {
						ChainFusion: {
							direction: { CkSolToSol: null },
							source_token: { Icrc: Principal.fromText(IC_CKSOL_LEDGER_CANISTER_ID) },
							dest_token: { SolNativeMainnet: null },
							amount: 10n ** BigInt(ckSolSource.decimals)
						}
					}
				})
			);

			expect(refsOfLastCreate()).toStrictEqual(
				expect.objectContaining({
					chain_fusion_withdraw_sol_index: '9',
					chain_fusion_minter_id: IC_CKSOL_MINTER_CANISTER_ID
				})
			);

			expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_cketh_index');
			expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_retrieve_btc_index');
		});

		it('should not surface a failed active-user-transaction creation as a swap failure', async () => {
			const result = { type: 'ckEthToEth', blockIndex: 7n } as const;

			mockSendIc(result);
			vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('backend down'));

			// The funds have already left the wallet — a bookkeeping failure must not read
			// as the conversion having failed.
			await expect(
				fetchChainFusionIcpSwap({
					...swapParams,
					sourceToken: ckEthSource,
					destinationToken: ETHEREUM_TOKEN
				})
			).resolves.toStrictEqual(result);
		});

		// `sendIc` holds its result behind a deliberate wallet-refresh wait; the row must
		// already exist if that wait never finishes (a refresh, a tab close).
		it('should create the row from the burn boundary, before sendIc resolves', async () => {
			vi.mocked(sendIc).mockImplementation(async ({ onSent }) => {
				await onSent?.({ result: { type: 'ckBtcToBtc', blockIndex: 42n } });
				throw new Error('interrupted during the wallet refresh');
			});

			await expect(
				fetchChainFusionIcpSwap({
					...swapParams,
					sourceToken: {
						...makeCkToken({
							ledgerCanisterId: IC_CKBTC_LEDGER,
							twinToken: BTC_MAINNET_TOKEN,
							symbol: 'ckBTC-boundary-source'
						}),
						minterCanisterId: MINTER_CANISTER_ID
					},
					destinationToken: BTC_MAINNET_TOKEN,
					destinationAddress: mockBtcAddress
				})
			).rejects.toThrow('interrupted during the wallet refresh');

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
		});
	});

	describe('fetchChainFusionEvmSwap', () => {
		const progress = vi.fn();

		const DEPOSIT_TX_HASH = '0xdeadbeef';
		const HELPER_CONTRACT = '0x7574eB42cA208A4f6960ECCAfDF186D627dCC175';

		const ckEthDestination: IcCkToken = {
			...makeCkToken({
				ledgerCanisterId: IC_CKETH_LEDGER,
				twinToken: ETHEREUM_TOKEN,
				symbol: 'ckETH-mint-destination'
			}),
			minterCanisterId: MINTER_CANISTER_ID
		};

		const ckUsdcDestination: IcCkToken = {
			...makeCkToken({
				ledgerCanisterId: IC_CKUSDC_LEDGER,
				twinToken: USDC_TOKEN,
				symbol: 'ckUSDC-mint-destination'
			}),
			minterCanisterId: MINTER_CANISTER_ID
		};

		const swapParams = {
			identity: mockIdentity,
			progress,
			swapAmount: '1',
			userAddress: mockEthAddress,
			helperContractAddress: HELPER_CONTRACT,
			sourceNetwork: ETHEREUM_TOKEN.network as EthereumNetwork,
			minterInfo: undefined,
			gas: 1n,
			maxFeePerGas: 1n,
			maxPriorityFeePerGas: 1n,
			swapId: SWAP_ID
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(sendEth).mockResolvedValue({ hash: DEPOSIT_TX_HASH, nonce: 1 });
		});

		it('should create an active user transaction carrying what the mint poller needs', async () => {
			await fetchChainFusionEvmSwap({
				...swapParams,
				sourceToken: ETHEREUM_TOKEN as unknown as Erc20Token,
				destinationToken: ckEthDestination
			});

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					id: SWAP_ID,
					data: {
						ChainFusion: {
							direction: { EthToCkEth: null },
							source_token: { EvmNative: 1n },
							dest_token: { Icrc: Principal.fromText(IC_CKETH_LEDGER) },
							amount: 1_000_000_000_000_000_000n
						}
					}
				})
			);

			expect(refsOfLastCreate()).toStrictEqual(
				expect.objectContaining({
					chain_fusion_deposit_tx: DEPOSIT_TX_HASH,
					chain_fusion_helper: HELPER_CONTRACT,
					chain_fusion_minter_id: MINTER_CANISTER_ID
				})
			);

			// Learned only once the deposit mines; nothing to snapshot at creation.
			expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_deposit_block');
		});

		it('should record an ERC20 deposit as the Erc20ToCkErc20 direction', async () => {
			await fetchChainFusionEvmSwap({
				...swapParams,
				sourceToken: USDC_TOKEN,
				destinationToken: ckUsdcDestination
			});

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					data: expect.objectContaining({
						ChainFusion: expect.objectContaining({
							direction: { Erc20ToCkErc20: null },
							source_token: { Erc20: [USDC_TOKEN.address, 1n] }
						})
					})
				})
			);
		});

		it('should not surface a failed active-user-transaction creation as a swap failure', async () => {
			vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('backend down'));

			await expect(
				fetchChainFusionEvmSwap({
					...swapParams,
					sourceToken: ETHEREUM_TOKEN as unknown as Erc20Token,
					destinationToken: ckEthDestination
				})
			).resolves.toBeUndefined();
		});

		// A row with no minter to ask could never terminalize, and would hold one of the
		// user's slots for good. Not tracking it at all is the lesser evil.
		it('should create no row when the ck token names no minter', async () => {
			await fetchChainFusionEvmSwap({
				...swapParams,
				sourceToken: ETHEREUM_TOKEN as unknown as Erc20Token,
				destinationToken: { ...ckEthDestination, minterCanisterId: undefined }
			});

			expect(sendEth).toHaveBeenCalledOnce();
			expect(createActiveUserTransaction).not.toHaveBeenCalled();
		});
	});

	describe('fetchChainFusionBtcQuote', () => {
		const ckBtcDestination = makeCkToken({
			ledgerCanisterId: IC_CKBTC_LEDGER,
			twinToken: BTC_MAINNET_TOKEN,
			symbol: 'ckBTC-destination'
		});

		const btcQuote = (
			params: SwapQuoteObserver & Partial<{ sourceToken: Token; destinationToken: Token }> = {}
		) =>
			fetchChainFusionBtcQuote({
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: ckBtcDestination,
				amount: AMOUNT,
				userBtcAddress: mockBtcAddress,
				slippage: 0,
				...params
			} as BtcQuoteParams);

		beforeEach(() => {
			mockEnabled = true;

			ckBtcMinterInfoStore.reset(ckBtcDestination.id);
			ckBtcMinterInfoStore.set({
				id: ckBtcDestination.id,
				data: { data: mockCkBtcMinterInfo, certified: true }
			});

			btcAddressStore.reset(ckBtcDestination.id);
			btcAddressStore.set({
				id: ckBtcDestination.id,
				data: { data: mockBtcDepositAddress, certified: true }
			});

			allUtxosStore.setAllUtxos({ allUtxos: [mockUtxo] });
			feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 2_000n });

			vi.mocked(prepareBtcSend).mockReturnValue(mockUtxosFee);
		});

		// Every fee of a deposit is charged on top of what the minter credits, exactly as
		// `BtcConvertFees` presents them, so the offer is 1:1.
		// Verified against a real conversion: depositing 1 000 satoshis minted 900 against a
		// 100-satoshi `kyt_fee`. The network fee comes out of the transaction's change, so it
		// is charged on top. `BtcConvertFees`'s zero-valued conversion-fee row is not carried
		// over — "Free" is not a fee worth a line in an offer list.
		it('reports BTC local pricing but not a mint without a deposit address', async () => {
			const onProviderParticipating = vi.fn();
			await btcQuote({ onProviderParticipating });

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.CHAIN_FUSION);

			onProviderParticipating.mockClear();
			btcAddressStore.reset(ckBtcDestination.id);
			await btcQuote({ onProviderParticipating });

			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('should deduct only the KYT fee from what the minter credits', async () => {
			await expect(btcQuote()).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT - mockCkBtcMinterInfo.kyt_fee,
				swapDetails: {
					sourceFees: [
						{
							labelPath: 'fee.text.convert_inter_network_fee',
							fee: mockCkBtcMinterInfo.kyt_fee,
							token: BTC_MAINNET_TOKEN,
							deductedFromAmount: true
						},
						{
							labelPath: 'fee.text.convert_btc_network_fee',
							fee: mockUtxosFee.feeSatoshis,
							token: BTC_MAINNET_TOKEN
						}
					],
					externalFees: []
				}
			});
		});

		it('should select UTXOs for the amount actually being deposited', async () => {
			await btcQuote();

			expect(prepareBtcSend).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: '0.01',
					source: mockBtcAddress,
					allUtxos: [mockUtxo],
					feeRateMiliSatoshisPerVByte: 2_000n
				})
			);
		});

		// Regression: the quote priced the deposit address's P2WPKH output while the swap is sent
		// with the shared loader's fee, priced for the largest output. With UTXOs of 10 150 and
		// 9 000 sats, a 10 000-sat swap at 1 sat/vB was quoted one input and 141 sats, then sent
		// with two inputs and 221.
		it('should price the fee without a recipient, as the swap is sent', async () => {
			await btcQuote();

			expect(prepareBtcSend).toHaveBeenLastCalledWith(
				expect.not.objectContaining({ destination: expect.anything() })
			);
		});

		it('should not quote a testnet Bitcoin source', async () => {
			await expect(btcQuote({ sourceToken: BTC_TESTNET_TOKEN })).resolves.toBeUndefined();
		});

		it('should not quote when the destination is not the ck twin', async () => {
			await expect(btcQuote({ destinationToken: ckEthToken })).resolves.toBeUndefined();
		});

		it('should not quote when the minter info is absent', async () => {
			ckBtcMinterInfoStore.reset(ckBtcDestination.id);

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		// Without it there is nowhere to deposit, so the offer could never be executed.
		it('should not quote when the minter deposit address is unknown', async () => {
			btcAddressStore.reset(ckBtcDestination.id);

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the UTXO set has not been loaded', async () => {
			allUtxosStore.reset();

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the fee rate has not been loaded', async () => {
			feeRatePercentilesStore.reset();

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		// Quoting an unusable selection would advertise a fee the send then refuses.
		it.each([
			BtcPrepareSendError.PendingTransactionsNotAvailable,
			BtcPrepareSendError.InsufficientBalance,
			BtcPrepareSendError.InsufficientBalanceForFee,
			BtcPrepareSendError.UtxoLocked
		])('should not quote when the UTXO selection fails with %s', async (error) => {
			vi.mocked(prepareBtcSend).mockReturnValue({
				feeSatoshis: ZERO,
				feeRateMiliSatoshisPerVByte: 4000n,
				utxos: [],
				error
			});

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the UTXO selection picked no inputs', async () => {
			vi.mocked(prepareBtcSend).mockReturnValue({
				feeSatoshis: 1_000n,
				feeRateMiliSatoshisPerVByte: 4000n,
				utxos: []
			});

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the flag is off', async () => {
			mockEnabled = false;

			await expect(btcQuote()).resolves.toBeUndefined();
		});
	});

	describe('fetchChainFusionIcpQuote for the Bitcoin family', () => {
		const ckBtcSource = makeCkToken({
			ledgerCanisterId: IC_CKBTC_LEDGER,
			twinToken: BTC_MAINNET_TOKEN,
			symbol: 'ckBTC-source'
		});

		const icpQuote = (
			params: SwapQuoteObserver & Partial<{ sourceToken: Token; destinationToken: Token }> = {}
		) =>
			fetchChainFusionIcpQuote({
				sourceToken: ckBtcSource,
				destinationToken: BTC_MAINNET_TOKEN,
				amount: AMOUNT,
				userEthAddress: undefined,
				slippage: 0,
				...params
			} as IcpBridgeQuoteParams);

		beforeEach(() => {
			mockEnabled = true;

			ckBtcMinterInfoStore.reset(ckBtcSource.id);
			ckBtcMinterInfoStore.set({
				id: ckBtcSource.id,
				data: { data: mockCkBtcMinterInfo, certified: true }
			});

			vi.mocked(estimateFee).mockResolvedValue({
				bitcoin_fee: BITCOIN_FEE,
				minter_fee: MINTER_FEE
			});
		});

		// Only the fee the minter pays out of what it withdraws reduces the receive amount —
		// the same one `IcTokenFees` reports as a destination-token fee. Verified against
		// finalized withdrawals: they pay out exactly `amount - bitcoin_fee - minter_fee`. The
		// KYT fee `IcTokenFees` also lists is not charged to the user on a withdrawal, so it
		// is not quoted at all — neither deducted nor on top.
		it('reports ckBTC withdrawal pricing only with minter prerequisites', async () => {
			const onProviderParticipating = vi.fn();
			await icpQuote({ onProviderParticipating });

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.CHAIN_FUSION);

			onProviderParticipating.mockClear();
			ckBtcMinterInfoStore.reset(ckBtcSource.id);
			await icpQuote({ onProviderParticipating });

			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('should deduct only the Bitcoin network and minter fees, and not quote the KYT fee', async () => {
			await expect(icpQuote()).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT - (BITCOIN_FEE + MINTER_FEE),
				swapDetails: {
					sourceFees: [
						{ labelPath: 'fee.text.fee', fee: CK_LEDGER_FEE, token: ckBtcSource },
						{
							labelPath: 'fee.text.estimated_btc',
							fee: BITCOIN_FEE + MINTER_FEE,
							token: BTC_MAINNET_TOKEN,
							deductedFromAmount: true
						}
					],
					externalFees: [],
					minimumAmount: mockCkBtcMinterInfo.retrieve_btc_min_amount,
					minterInfoCertified: true
				}
			});
		});

		// The estimate moves with the amount, so it cannot be quoted once and reused.
		it('should price the withdrawal for the amount being withdrawn', async () => {
			await icpQuote();

			expect(estimateFee).toHaveBeenCalledWith(
				expect.objectContaining({ amount: AMOUNT, certified: false })
			);
		});

		it('should flag a withdrawal quoted off an uncertified minter info read', async () => {
			ckBtcMinterInfoStore.set({
				id: ckBtcSource.id,
				data: { data: mockCkBtcMinterInfo, certified: false }
			});

			const result = await icpQuote();

			expect(
				(result as { swapDetails: { minterInfoCertified?: boolean } }).swapDetails
					.minterInfoCertified
			).toBeFalsy();
		});

		it('should not quote a testnet Bitcoin destination', async () => {
			const ckTestnetBtc = makeCkToken({
				ledgerCanisterId: IC_CKBTC_LEDGER,
				twinToken: BTC_TESTNET_TOKEN,
				symbol: 'ckTESTBTC'
			});

			await expect(
				icpQuote({ sourceToken: ckTestnetBtc, destinationToken: BTC_TESTNET_TOKEN })
			).resolves.toBeUndefined();
		});

		it('should not quote when the minter info is absent', async () => {
			ckBtcMinterInfoStore.reset(ckBtcSource.id);

			await expect(icpQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the fee estimate fails', async () => {
			vi.mocked(estimateFee).mockRejectedValue(new Error('minter unreachable'));

			await expect(icpQuote()).resolves.toBeUndefined();
		});

		it('should clamp the receive amount at zero when the fees reach the amount', async () => {
			vi.mocked(estimateFee).mockResolvedValue({
				bitcoin_fee: AMOUNT,
				minter_fee: MINTER_FEE
			});

			const result = await icpQuote();

			expect((result as { receiveAmount: bigint }).receiveAmount).toBe(ZERO);
		});

		it('should not quote when the flag is off', async () => {
			mockEnabled = false;

			await expect(icpQuote()).resolves.toBeUndefined();
		});
	});

	describe('fetchChainFusionIcpQuote for ckSOL', () => {
		const WITHDRAWAL_FEE = 1_000_000n;
		const MINIMUM_WITHDRAWAL_AMOUNT = 2_000_000n;

		const ckSolSource: IcCkToken = {
			...makeCkToken({
				ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
				twinToken: SOLANA_TOKEN,
				symbol: 'ckSOL-source'
			}),
			minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID
		};

		const icpQuote = (
			params: SwapQuoteObserver & Partial<{ sourceToken: Token; destinationToken: Token }> = {}
		) =>
			fetchChainFusionIcpQuote({
				sourceToken: ckSolSource,
				destinationToken: SOLANA_TOKEN,
				amount: AMOUNT,
				userEthAddress: undefined,
				slippage: 0,
				...params
			} as IcpBridgeQuoteParams);

		beforeEach(() => {
			vi.clearAllMocks();

			mockEnabled = true;

			vi.mocked(ckSolMinterInfo).mockResolvedValue({
				deposit_sol_fee: 45_000_000_000n,
				balance: 995_500n,
				withdrawal_fee: WITHDRAWAL_FEE,
				minimum_deposit_amount: 20_000_000n,
				deposit_sol_required_cycles: 1_000_000_000_000n,
				nonce_accounts: [],
				minimum_withdrawal_amount: MINIMUM_WITHDRAWAL_AMOUNT,
				minter_address: [],
				automatic_deposit_fee: [],
				collected_automatic_deposit_fees: []
			});
		});

		// The ledger fee for the approval is charged beside the amount; the minter's
		// withdrawal fee comes out of what reaches the Solana address.
		it('should deduct the minter withdrawal fee and charge the ledger fee on top', async () => {
			await expect(icpQuote()).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT - WITHDRAWAL_FEE,
				swapDetails: {
					sourceFees: [
						{ labelPath: 'fee.text.fee', fee: CK_LEDGER_FEE, token: ckSolSource },
						{
							labelPath: 'fee.text.convert_inter_network_fee',
							fee: WITHDRAWAL_FEE,
							token: SOLANA_TOKEN,
							deductedFromAmount: true
						}
					],
					externalFees: [],
					minimumAmount: MINIMUM_WITHDRAWAL_AMOUNT
				}
			});
		});

		it('should read the minter info anonymously and uncertified', async () => {
			await icpQuote();

			expect(ckSolMinterInfo).toHaveBeenCalledExactlyOnceWith({
				identity: expect.any(AnonymousIdentity),
				minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID,
				certified: false
			});
		});

		it('should report Chain Fusion as participating', async () => {
			const onProviderParticipating = vi.fn();

			await icpQuote({ onProviderParticipating });

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.CHAIN_FUSION);
		});

		it('should not quote without a minter', async () => {
			const onProviderParticipating = vi.fn();
			const sourceToken: IcCkToken = { ...ckSolSource, minterCanisterId: undefined };

			await expect(
				icpQuote({
					sourceToken,
					onProviderParticipating
				})
			).resolves.toBeUndefined();

			expect(ckSolMinterInfo).not.toHaveBeenCalled();
			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('should not quote a Solana devnet destination', async () => {
			await expect(
				icpQuote({
					sourceToken: { ...ckSolSource, twinToken: SOLANA_DEVNET_TOKEN } as Token,
					destinationToken: SOLANA_DEVNET_TOKEN
				})
			).resolves.toBeUndefined();

			expect(ckSolMinterInfo).not.toHaveBeenCalled();
		});

		it('should not quote another destination', async () => {
			await expect(icpQuote({ destinationToken: ETHEREUM_TOKEN })).resolves.toBeUndefined();

			expect(ckSolMinterInfo).not.toHaveBeenCalled();
		});

		it('should not quote when the minter info read fails', async () => {
			vi.mocked(ckSolMinterInfo).mockRejectedValue(new Error('minter unreachable'));

			await expect(icpQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the flag is off', async () => {
			mockEnabled = false;

			await expect(icpQuote()).resolves.toBeUndefined();

			expect(ckSolMinterInfo).not.toHaveBeenCalled();
		});
	});

	describe('fetchChainFusionBtcSwap', () => {
		const progress = vi.fn();

		const ckBtcDestination = makeCkToken({
			ledgerCanisterId: IC_CKBTC_LEDGER,
			twinToken: BTC_MAINNET_TOKEN,
			symbol: 'ckBTC-destination'
		});

		const swapParams = {
			identity: mockIdentity,
			progress,
			sourceToken: BTC_MAINNET_TOKEN,
			destinationToken: { ...ckBtcDestination, minterCanisterId: MINTER_CANISTER_ID },
			amount: '0.01',
			source: mockBtcAddress,
			depositAddress: mockBtcDepositAddress,
			network: 'mainnet' as const,
			utxosFee: mockUtxosFee,
			swapId: SWAP_ID
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockEnabled = true;
			// The real `sendBtc` hands the txid over the moment the transaction is
			// broadcast, before its own bookkeeping.
			vi.mocked(sendBtc).mockImplementation(async ({ onBroadcast }) => {
				await onBroadcast?.({ txid: 'txid' });
				return 'txid';
			});
			vi.mocked(createActiveUserTransaction).mockResolvedValue(undefined);
		});

		it('should send the deposit to the minter address on the quoted selection', async () => {
			await fetchChainFusionBtcSwap(swapParams);

			expect(sendBtc).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					amount: '0.01',
					source: mockBtcAddress,
					destination: mockBtcDepositAddress,
					network: 'mainnet',
					utxosFee: mockUtxosFee
				})
			);
		});

		// `sendBtc` reports progress through a bare callback: once before signing, once after
		// the transaction is recorded as pending.
		it('should advance the swap stepper on each progress callback', async () => {
			vi.mocked(sendBtc).mockImplementation(({ onProgress }) => {
				onProgress?.();
				onProgress?.();
				return Promise.resolve('txid');
			});

			await fetchChainFusionBtcSwap(swapParams);

			expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SWAP);
			expect(progress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.UPDATE_UI);
		});

		it('should enable the destination token once the deposit is broadcast', async () => {
			const enableDestinationToken = vi.fn().mockResolvedValue(undefined);

			await fetchChainFusionBtcSwap({ ...swapParams, enableDestinationToken });

			expect(enableDestinationToken).toHaveBeenCalledOnce();
		});

		it('should create an active user transaction keyed on the deposit transaction', async () => {
			await fetchChainFusionBtcSwap({ ...swapParams, usdSourceValue: '900' });

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					id: SWAP_ID,
					data: {
						ChainFusion: {
							direction: { BtcToCkBtc: null },
							source_token: { BtcNativeMainnet: null },
							dest_token: { Icrc: Principal.fromText(IC_CKBTC_LEDGER) },
							// `amount: '0.01'` in satoshis.
							amount: 1_000_000n
						}
					}
				})
			);

			expect(refsOfLastCreate()).toStrictEqual(
				expect.objectContaining({
					chain_fusion_btc_tx: 'txid',
					chain_fusion_btc_deposit: mockBtcDepositAddress,
					chain_fusion_minter_id: MINTER_CANISTER_ID,
					amount: '0.01',
					usd_source_value: '900',
					source_token_symbol: BTC_MAINNET_TOKEN.symbol,
					destination_token_symbol: 'ckBTC-destination'
				})
			);
		});

		// The minter is asked about the deposit, so a row without its id could never settle.
		it('should skip the row when the ckBTC minter is unknown', async () => {
			await fetchChainFusionBtcSwap({
				...swapParams,
				destinationToken: { ...ckBtcDestination, minterCanisterId: undefined }
			});

			expect(sendBtc).toHaveBeenCalledOnce();
			expect(createActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('should not surface a failed active-user-transaction creation as a swap failure', async () => {
			vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('backend down'));

			// The deposit is already broadcast — a bookkeeping failure must not read as the
			// conversion having failed.
			await expect(fetchChainFusionBtcSwap(swapParams)).resolves.toBeUndefined();
		});

		it('should surface a send failure to the caller', async () => {
			vi.mocked(sendBtc).mockRejectedValue(new Error('signer unavailable'));

			await expect(fetchChainFusionBtcSwap(swapParams)).rejects.toThrow('signer unavailable');
		});

		it('should create no row when the deposit was never broadcast', async () => {
			vi.mocked(sendBtc).mockRejectedValue(new Error('signer unavailable'));

			await expect(fetchChainFusionBtcSwap(swapParams)).rejects.toThrow();

			expect(createActiveUserTransaction).not.toHaveBeenCalled();
		});

		// The steps between the broadcast and `sendBtc` resolving are best-effort
		// bookkeeping; their failure must not leave an irreversible deposit untracked.
		it('should create the row even when sendBtc fails after the broadcast', async () => {
			vi.mocked(sendBtc).mockImplementation(async ({ onBroadcast }) => {
				await onBroadcast?.({ txid: 'txid' });
				throw new Error('wallet refresh failed');
			});

			await expect(fetchChainFusionBtcSwap(swapParams)).rejects.toThrow('wallet refresh failed');

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
		});

		describe('through the backend', () => {
			const broadcast = vi.fn();

			// As the real `sendBtc` does on the backend path: `beforeBroadcast` once signed, then the
			// broadcast, which either goes out or fails with `failure`.
			const sendThroughBackend = (failure?: unknown) =>
				vi.mocked(sendBtc).mockImplementation(async ({ beforeBroadcast, onBroadcast }) => {
					await beforeBroadcast?.({ txid: 'txid' });

					broadcast();

					if (nonNullish(failure)) {
						throw failure;
					}

					await onBroadcast?.({ txid: 'txid' });

					return 'txid';
				});

			beforeEach(() => {
				broadcast.mockClear();
				vi.mocked(deleteUnbroadcastActiveUserTransaction).mockResolvedValue(undefined);
			});

			it('should create the row before the broadcast, and only once', async () => {
				vi.mocked(createActiveUserTransaction).mockImplementation(() => {
					expect(broadcast).not.toHaveBeenCalled();

					return Promise.resolve();
				});
				sendThroughBackend();

				await fetchChainFusionBtcSwap(swapParams);

				expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ id: SWAP_ID })
				);
				expect(refsOfLastCreate()).toStrictEqual(
					expect.objectContaining({ chain_fusion_btc_tx: 'txid' })
				);
				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('should broadcast nothing when the row cannot be written, and delete it all the same', async () => {
				vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('backend down'));
				sendThroughBackend();

				await expect(fetchChainFusionBtcSwap(swapParams)).rejects.toThrow('backend down');

				expect(broadcast).not.toHaveBeenCalled();
				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: SWAP_ID
				});
			});

			it('should delete the row when the broadcast is refused outright', async () => {
				const refusal = new BtcBroadcastTransactionCanisterError({ FeeTooLow: null }, 'fee');
				sendThroughBackend(refusal);

				await expect(fetchChainFusionBtcSwap(swapParams)).rejects.toBe(refusal);

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: SWAP_ID
				});
			});

			it.each([
				new BtcBroadcastTransactionCanisterError(
					{ BroadcastOutcomeUnknown: { msg: 'trap' } },
					'unknown'
				),
				new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') })
			])('should keep the row after an unclear outcome: %s', async (unclear) => {
				sendThroughBackend(unclear);

				await expect(fetchChainFusionBtcSwap(swapParams)).rejects.toBe(unclear);

				expect(createActiveUserTransaction).toHaveBeenCalledOnce();
				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			});

			// The deposit may have gone out, so the minted ckBTC must not land in a hidden token.
			it('should enable the destination after an unclear outcome, but not after a refusal', async () => {
				const enableDestinationToken = vi.fn().mockResolvedValue(undefined);

				sendThroughBackend(new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') }));

				await expect(
					fetchChainFusionBtcSwap({ ...swapParams, enableDestinationToken })
				).rejects.toBeInstanceOf(BtcBroadcastUnconfirmedError);

				expect(enableDestinationToken).toHaveBeenCalledOnce();

				enableDestinationToken.mockClear();
				sendThroughBackend(new BtcBroadcastTransactionCanisterError({ FeeTooLow: null }, 'fee'));

				await expect(
					fetchChainFusionBtcSwap({ ...swapParams, enableDestinationToken })
				).rejects.toBeInstanceOf(BtcBroadcastTransactionCanisterError);

				expect(enableDestinationToken).not.toHaveBeenCalled();
			});
		});
	});

	describe('SOL → ckSOL', () => {
		const AUTOMATIC_DEPOSIT_FEE = 2_000_000n;
		const MINIMUM_DEPOSIT_AMOUNT = 20_000_000n;
		const SWEEP_FEE = 5_000n;
		const RENT = 890_880n;
		const SOL_AMOUNT = 50_000_000n;
		const DEPOSIT_ADDRESS = mockSolAddress2;
		const TRANSFER_SIGNATURE =
			'5LrcE2f6uvydKRquEJ8xp19heGxSvqsVbcqUeFoiWbXe8JNip7ftPQNTAVPyTK7ijVdpkzmKKaAQR7MWMmujAhXD';

		const ckSolDestination: IcCkToken = {
			...makeCkToken({
				ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
				twinToken: SOLANA_TOKEN,
				symbol: 'ckSOL-destination'
			}),
			minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID
		};

		const minterInfoWithFee = (automaticDepositFee: bigint | undefined): CkSolMinterInfo => ({
			deposit_sol_fee: 45_000_000_000n,
			balance: 995_500n,
			withdrawal_fee: 1_000_000n,
			minimum_deposit_amount: MINIMUM_DEPOSIT_AMOUNT,
			deposit_sol_required_cycles: 1_000_000_000_000n,
			nonce_accounts: [],
			minimum_withdrawal_amount: 2_000_000n,
			minter_address: [],
			automatic_deposit_fee: toNullable(automaticDepositFee),
			collected_automatic_deposit_fees: toNullable(ZERO)
		});

		const solMintRow = (status: ActiveUserTransactionStatus): ActiveUserTransaction => ({
			...mockChainFusionActiveUserTransaction,
			status,
			data: {
				ChainFusion: {
					direction: { SolToCkSol: null },
					source_token: { SolNativeMainnet: null },
					dest_token: { Icrc: Principal.fromText(IC_CKSOL_LEDGER_CANISTER_ID) },
					amount: SOL_AMOUNT
				}
			}
		});

		beforeEach(() => {
			vi.clearAllMocks();

			mockEnabled = true;

			mockAuthStore();

			activeUserTransactionsStore.reset();
			activeUserTransactionsStore.init(mockPrincipal);

			vi.mocked(ckSolMinterInfo).mockResolvedValue(minterInfoWithFee(AUTOMATIC_DEPOSIT_FEE));
			vi.mocked(loadCkSolDepositAddress).mockResolvedValue(DEPOSIT_ADDRESS);
			vi.mocked(getSolBalance).mockResolvedValue(ZERO);
		});

		describe('fetchChainFusionSolQuote', () => {
			const solQuote = (
				params: SwapQuoteObserver &
					Partial<{ sourceToken: Token; destinationToken: Token; amount: bigint }> = {}
			) =>
				fetchChainFusionSolQuote({
					sourceToken: SOLANA_TOKEN,
					destinationToken: ckSolDestination,
					amount: SOL_AMOUNT,
					userAddress: mockSolAddress,
					slippage: 0,
					...params
				} as NearIntentsQuoteParams);

			const fee = ({ labelPath, fee }: { labelPath: string; fee: bigint }) => ({
				labelPath,
				fee,
				token: SOLANA_TOKEN,
				deductedFromAmount: true
			});

			it('should deduct the deposit fee, the sweep fee and the whole rent for an empty deposit address', async () => {
				const onProviderParticipating = vi.fn();

				await expect(solQuote({ onProviderParticipating })).resolves.toStrictEqual({
					provider: SwapProvider.CHAIN_FUSION,
					receiveAmount: SOL_AMOUNT - AUTOMATIC_DEPOSIT_FEE - SWEEP_FEE - RENT,
					swapDetails: {
						sourceFees: [
							fee({ labelPath: 'fee.text.convert_inter_network_fee', fee: AUTOMATIC_DEPOSIT_FEE }),
							fee({ labelPath: 'fee.text.cksol_sweep_fee', fee: SWEEP_FEE }),
							fee({ labelPath: 'fee.text.cksol_deposit_address_rent', fee: RENT })
						],
						externalFees: [],
						minimumAmount: MINIMUM_DEPOSIT_AMOUNT,
						solDeposit: { address: DEPOSIT_ADDRESS, automaticDepositFee: AUTOMATIC_DEPOSIT_FEE }
					}
				});

				expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.CHAIN_FUSION);
				expect(ckSolMinterInfo).toHaveBeenCalledExactlyOnceWith({
					identity: expect.any(AnonymousIdentity),
					minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID,
					certified: false
				});
				expect(loadCkSolDepositAddress).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID
				});
				expect(getSolBalance).toHaveBeenCalledExactlyOnceWith({
					address: DEPOSIT_ADDRESS,
					network: SolanaNetworks.mainnet
				});
			});

			it('should deduct only the part of the rent the deposit address lacks', async () => {
				vi.mocked(getSolBalance).mockResolvedValue(400_000n);

				const result = await solQuote();

				expect(result?.receiveAmount).toBe(
					SOL_AMOUNT - AUTOMATIC_DEPOSIT_FEE - SWEEP_FEE - (RENT - 400_000n)
				);
			});

			it('should leave out the rent once the deposit address holds it', async () => {
				vi.mocked(getSolBalance).mockResolvedValue(RENT);

				const result = await solQuote();

				expect(result?.receiveAmount).toBe(SOL_AMOUNT - AUTOMATIC_DEPOSIT_FEE - SWEEP_FEE);
				expect(
					result?.provider === SwapProvider.CHAIN_FUSION
						? result.swapDetails.sourceFees.map(({ labelPath }) => labelPath)
						: undefined
				).toStrictEqual(['fee.text.convert_inter_network_fee', 'fee.text.cksol_sweep_fee']);
			});

			// The mainnet minter of today: without the automatic flow, nothing would mint the SOL.
			it('should make no offer when the minter reports no automatic deposit fee', async () => {
				vi.mocked(ckSolMinterInfo).mockResolvedValue(minterInfoWithFee(undefined));

				await expect(solQuote()).resolves.toBeUndefined();

				expect(getSolBalance).not.toHaveBeenCalled();
			});

			// Acceptance criterion 8.
			it('should make no offer while a SOL → ckSOL conversion is in flight', async () => {
				const onProviderParticipating = vi.fn();

				activeUserTransactionsStore.upsert({ transaction: solMintRow({ Executing: null }) });

				await expect(solQuote({ onProviderParticipating })).resolves.toBeUndefined();

				expect(onProviderParticipating).not.toHaveBeenCalled();
				expect(ckSolMinterInfo).not.toHaveBeenCalled();
			});

			it('should offer again once that conversion has finished', async () => {
				activeUserTransactionsStore.upsert({ transaction: solMintRow({ Succeeded: null }) });

				await expect(solQuote()).resolves.toEqual(
					expect.objectContaining({ provider: SwapProvider.CHAIN_FUSION })
				);
			});

			it('should make no offer without a signed-in identity', async () => {
				mockAuthStore(null);

				await expect(solQuote()).resolves.toBeUndefined();

				expect(loadCkSolDepositAddress).not.toHaveBeenCalled();
			});

			it('should make no offer for Devnet SOL or another destination', async () => {
				await expect(solQuote({ sourceToken: SOLANA_DEVNET_TOKEN })).resolves.toBeUndefined();
				await expect(solQuote({ destinationToken: ckEthToken })).resolves.toBeUndefined();

				expect(ckSolMinterInfo).not.toHaveBeenCalled();
			});

			it('should make no offer when the provider is disabled', async () => {
				mockEnabled = false;

				await expect(solQuote()).resolves.toBeUndefined();

				expect(ckSolMinterInfo).not.toHaveBeenCalled();
			});

			it('should make no offer when the deposit address cannot be read', async () => {
				const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

				vi.mocked(loadCkSolDepositAddress).mockRejectedValue(new Error('unreachable'));

				await expect(solQuote()).resolves.toBeUndefined();

				expect(spyConsoleError).toHaveBeenCalledOnce();
			});
		});

		describe('fetchChainFusionSolSwap', () => {
			const progress = vi.fn();
			const enableDestinationToken = vi.fn();

			const swapDetails: ChainFusionSwapDetails = {
				sourceFees: [],
				externalFees: [],
				minimumAmount: MINIMUM_DEPOSIT_AMOUNT,
				solDeposit: { address: DEPOSIT_ADDRESS, automaticDepositFee: AUTOMATIC_DEPOSIT_FEE }
			};

			const watched = {
				address: DEPOSIT_ADDRESS,
				minimum_deposit_amount: MINIMUM_DEPOSIT_AMOUNT,
				automatic_deposit_fee: AUTOMATIC_DEPOSIT_FEE,
				status: {
					Watching: {
						valid_until: 2n,
						scan_count: 0,
						last_scanned_at: [] as [],
						next_scan_at: [1n] as [bigint]
					}
				},
				latest_deposit_id: [41n] as [bigint]
			};

			const solSwap = () =>
				fetchChainFusionSolSwap({
					identity: mockIdentity,
					progress,
					sourceToken: SOLANA_TOKEN,
					destinationToken: ckSolDestination,
					swapAmount: '0.05',
					userAddress: mockSolAddress,
					swapDetails,
					swapId: SWAP_ID,
					usdSourceValue: '7.5',
					enableDestinationToken
				});

			const BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';
			const BLOCKHASH_SLOT = 345_000_000n;

			const broadcastSol = vi.fn();

			// `sendSol` as it runs: it signs, hands the transfer to `beforeBroadcast`, broadcasts it,
			// then waits for its confirmation.
			const mockTransfer = ({
				broadcastError,
				confirmError
			}: { broadcastError?: Error; confirmError?: Error } = {}) =>
				vi.mocked(sendSol).mockImplementation(async ({ beforeBroadcast, progress: step }) => {
					const signature = TRANSFER_SIGNATURE as Awaited<ReturnType<typeof sendSol>>;

					await beforeBroadcast?.({ signature, blockhash: BLOCKHASH });

					step?.(ProgressStepsSendSol.SEND);
					broadcastSol();

					if (nonNullish(broadcastError)) {
						throw broadcastError;
					}

					step?.(ProgressStepsSendSol.CONFIRM);

					if (nonNullish(confirmError)) {
						throw confirmError;
					}

					return signature;
				});

			beforeEach(() => {
				vi.mocked(watchDepositAddress).mockResolvedValue(watched);
				vi.mocked(isBlockhashValid).mockResolvedValue({ slot: BLOCKHASH_SLOT, valid: true });
				vi.mocked(createActiveUserTransaction).mockResolvedValue(undefined);
				mockTransfer();
				enableDestinationToken.mockResolvedValue(undefined);
			});

			// Acceptance criterion 5.
			it('should register the deposit address with the minter before sending the SOL to it', async () => {
				await solSwap();

				expect(watchDepositAddress).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID
				});
				expect(sendSol).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					token: SOLANA_TOKEN,
					amount: SOL_AMOUNT,
					prioritizationFee: ZERO,
					destination: DEPOSIT_ADDRESS,
					source: mockSolAddress,
					progress: expect.any(Function),
					beforeBroadcast: expect.any(Function)
				});
				expect(vi.mocked(watchDepositAddress).mock.invocationCallOrder[0]).toBeLessThan(
					vi.mocked(sendSol).mock.invocationCallOrder[0]
				);
			});

			// Acceptance criterion 6.
			it('should open the row before the transfer is broadcast', async () => {
				await solSwap();

				expect(isBlockhashValid).toHaveBeenCalledExactlyOnceWith({
					blockhash: BLOCKHASH,
					network: SolanaNetworks.mainnet
				});
				expect(vi.mocked(createActiveUserTransaction).mock.invocationCallOrder[0]).toBeLessThan(
					broadcastSol.mock.invocationCallOrder[0]
				);
				expect(refsOfLastCreate()).toMatchObject({
					chain_fusion_sol_tx: TRANSFER_SIGNATURE,
					chain_fusion_sol_blockhash: BLOCKHASH,
					chain_fusion_sol_blockhash_slot: `${BLOCKHASH_SLOT}`
				});
			});

			it('should leave out the blockhash slot when the node does not know the blockhash yet', async () => {
				vi.mocked(isBlockhashValid).mockResolvedValue({ slot: BLOCKHASH_SLOT, valid: false });

				await solSwap();

				expect(refsOfLastCreate()).toHaveProperty('chain_fusion_sol_blockhash', BLOCKHASH);
				expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_sol_blockhash_slot');
			});

			// Acceptance criterion 6.
			it('should open the row with the transfer, the deposit address and the latest deposit id, then enable ckSOL', async () => {
				await solSwap();

				expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						identity: mockIdentity,
						id: SWAP_ID,
						data: {
							ChainFusion: {
								direction: { SolToCkSol: null },
								source_token: { SolNativeMainnet: null },
								dest_token: { Icrc: Principal.fromText(IC_CKSOL_LEDGER_CANISTER_ID) },
								amount: SOL_AMOUNT
							}
						}
					})
				);
				expect(refsOfLastCreate()).toMatchObject({
					chain_fusion_minter_id: IC_CKSOL_MINTER_CANISTER_ID,
					chain_fusion_sol_tx: TRANSFER_SIGNATURE,
					chain_fusion_sol_deposit: DEPOSIT_ADDRESS,
					chain_fusion_cksol_latest: '41',
					amount: '0.05',
					usd_source_value: '7.5'
				});
				expect(enableDestinationToken).toHaveBeenCalledOnce();
				expect(progress.mock.calls.map(([step]) => step)).toStrictEqual([
					ProgressStepsSwap.SIGN_TRANSFER,
					ProgressStepsSwap.SWAP,
					ProgressStepsSwap.UPDATE_UI
				]);
			});

			it('should leave out the latest deposit id of an account without deposits', async () => {
				vi.mocked(watchDepositAddress).mockResolvedValue({ ...watched, latest_deposit_id: [] });

				await solSwap();

				expect(refsOfLastCreate()).not.toHaveProperty('chain_fusion_cksol_latest');
			});

			it('should go on with a fee lower than quoted', async () => {
				vi.mocked(watchDepositAddress).mockResolvedValue({
					...watched,
					automatic_deposit_fee: AUTOMATIC_DEPOSIT_FEE - 1n
				});

				await solSwap();

				expect(sendSol).toHaveBeenCalledOnce();
			});

			it.each([
				{
					name: 'a deposit is already in flight',
					answer: { ...watched, status: { Detected: { deposit_id: 41n } } },
					reason: 'inFlight'
				},
				{
					name: 'the deposit address is not the quoted one',
					answer: { ...watched, address: mockSolAddress },
					reason: 'changed'
				},
				{
					name: 'the minimum rose above the amount',
					answer: { ...watched, minimum_deposit_amount: SOL_AMOUNT + 1n },
					reason: 'changed'
				},
				{
					name: 'the fee rose above the quoted one',
					answer: { ...watched, automatic_deposit_fee: AUTOMATIC_DEPOSIT_FEE + 1n },
					reason: 'changed'
				},
				{
					name: 'no scan is due before the window ends',
					answer: {
						...watched,
						status: { Watching: { ...watched.status.Watching, next_scan_at: [] as [] } }
					},
					reason: 'unavailable'
				}
			])('should send no SOL when $name', async ({ answer, reason }) => {
				vi.mocked(watchDepositAddress).mockResolvedValue(answer);

				await expect(solSwap()).rejects.toMatchObject({ reason });

				expect(sendSol).not.toHaveBeenCalled();
				expect(createActiveUserTransaction).not.toHaveBeenCalled();
				expect(enableDestinationToken).not.toHaveBeenCalled();
			});

			it.each([
				{
					name: 'an earlier deposit is quarantined',
					error: new CkSolWatchDepositAddressError({ Quarantined: { deposit_id: 40n } }),
					reason: 'quarantined'
				},
				{
					name: 'the watchlist is full',
					error: new CkSolWatchDepositAddressError({
						TooManyWatchedAddresses: { latest_deposit_id: [] }
					}),
					reason: 'unavailable'
				},
				{
					name: 'the minter is temporarily unavailable',
					error: new CkSolWatchDepositAddressError({ TemporarilyUnavailable: 'upgrading' }),
					reason: 'unavailable'
				},
				{ name: 'the call fails', error: new Error('replica unavailable'), reason: 'unavailable' }
			])('should send no SOL when $name', async ({ error, reason }) => {
				vi.mocked(watchDepositAddress).mockRejectedValue(error);

				const promise = solSwap();

				await expect(promise).rejects.toBeInstanceOf(ChainFusionSolDepositRefusedError);
				await expect(promise).rejects.toMatchObject({ reason, cause: error });

				expect(sendSol).not.toHaveBeenCalled();
				expect(createActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('should open no row when the transfer fails before it is signed', async () => {
				vi.mocked(sendSol).mockRejectedValue(new Error('signer unavailable'));

				await expect(solSwap()).rejects.toThrow('signer unavailable');

				expect(createActiveUserTransaction).not.toHaveBeenCalled();
				expect(enableDestinationToken).not.toHaveBeenCalled();
			});

			it('should send no SOL when another tab or device has a conversion open', async () => {
				const alreadyInFlight = { AlreadyInFlight: null };
				vi.mocked(createActiveUserTransaction).mockRejectedValue(alreadyInFlight);

				const promise = solSwap();

				await expect(promise).rejects.toBeInstanceOf(ChainFusionSolDepositRefusedError);
				await expect(promise).rejects.toMatchObject({ reason: 'inFlight', cause: alreadyInFlight });

				expect(broadcastSol).not.toHaveBeenCalled();
				expect(enableDestinationToken).not.toHaveBeenCalled();
			});

			it('should send no SOL when the row cannot be written', async () => {
				vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('backend down'));

				await expect(solSwap()).rejects.toThrow('backend down');

				expect(broadcastSol).not.toHaveBeenCalled();
			});

			it('should send no SOL when the blockhash cannot be read', async () => {
				vi.mocked(isBlockhashValid).mockRejectedValue(new Error('rpc down'));

				await expect(solSwap()).rejects.toThrow('rpc down');

				expect(createActiveUserTransaction).not.toHaveBeenCalled();
				expect(broadcastSol).not.toHaveBeenCalled();
			});

			it('should delete the row when the node refuses the transfer', async () => {
				const refusal = new SolanaError(
					SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
					mockPreflightContext()
				);
				mockTransfer({ broadcastError: refusal });

				await expect(solSwap()).rejects.toBe(refusal);

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: SWAP_ID
				});
				expect(enableDestinationToken).not.toHaveBeenCalled();
			});

			it('should go on as sent, row kept and ckSOL enabled, when the broadcast may have gone out', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error');
				const transportError = new Error('fetch failed');
				mockTransfer({ broadcastError: transportError });

				await solSwap();

				expect(createActiveUserTransaction).toHaveBeenCalledOnce();
				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
				expect(enableDestinationToken).toHaveBeenCalledOnce();
				expect(consoleErrorSpy).toHaveBeenCalledOnce();
				expect(progress.mock.calls.map(([step]) => step)).toStrictEqual([
					ProgressStepsSwap.SIGN_TRANSFER,
					ProgressStepsSwap.SWAP,
					ProgressStepsSwap.UPDATE_UI
				]);
			});

			it('should go on as sent, row kept and ckSOL enabled, when confirming the broadcast transfer fails', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error');
				// A refusal answered while confirming comes after the broadcast.
				const nodeUnhealthy = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY, {
					numSlotsBehind: 42
				});
				mockTransfer({ confirmError: nodeUnhealthy });

				await solSwap();

				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
				expect(enableDestinationToken).toHaveBeenCalledOnce();
				expect(consoleErrorSpy).toHaveBeenCalledOnce();
			});
		});
	});
});
