import { sendBtc } from '$btc/services/btc-send.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BtcPrepareSendError } from '$btc/types/btc-send';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { send as sendEth } from '$eth/services/send.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { estimateFee } from '$icp/api/ckbtc-minter.api';
import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { sendIc } from '$icp/services/ic-send.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcCkWithdrawalResult } from '$icp/types/ic-send';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import {
	fetchChainFusionBtcQuote,
	fetchChainFusionBtcSwap,
	fetchChainFusionEvmQuote,
	fetchChainFusionEvmSwap,
	fetchChainFusionIcpQuote,
	fetchChainFusionIcpSwap
} from '$lib/services/chain-fusion-swap.services';
import {
	SwapProvider,
	type BtcQuoteParams,
	type EvmQuoteParams,
	type IcpBridgeQuoteParams
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcAddress, mockUtxo, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockValidIcCkToken,
	mockValidIcrcToken,
	mockValidIcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

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
	createActiveUserTransaction: vi.fn()
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

const quote = (params: Partial<{ sourceToken: Token; destinationToken: Token; amount: bigint }>) =>
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

		const icpQuote = (params: Partial<{ sourceToken: Token; destinationToken: Token }>) =>
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

			vi.mocked(sendEth).mockResolvedValue({ hash: DEPOSIT_TX_HASH });
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

		const btcQuote = (params: Partial<{ sourceToken: Token; destinationToken: Token }> = {}) =>
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
			vi.mocked(prepareBtcSend).mockReturnValue({ feeSatoshis: ZERO, utxos: [], error });

			await expect(btcQuote()).resolves.toBeUndefined();
		});

		it('should not quote when the UTXO selection picked no inputs', async () => {
			vi.mocked(prepareBtcSend).mockReturnValue({ feeSatoshis: 1_000n, utxos: [] });

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

		const icpQuote = (params: Partial<{ sourceToken: Token; destinationToken: Token }> = {}) =>
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
		// the same one `IcTokenFees` reports as a destination-token fee.
		it('should deduct only the Bitcoin network and minter fees', async () => {
			await expect(icpQuote()).resolves.toStrictEqual({
				provider: SwapProvider.CHAIN_FUSION,
				receiveAmount: AMOUNT - (BITCOIN_FEE + MINTER_FEE),
				swapDetails: {
					sourceFees: [
						{ labelPath: 'fee.text.fee', fee: CK_LEDGER_FEE, token: ckBtcSource },
						{
							labelPath: 'fee.text.estimated_inter_network',
							fee: mockCkBtcMinterInfo.kyt_fee,
							token: ckBtcSource
						},
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
	});
});
