import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { sendIc } from '$icp/services/ic-send.services';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import {
	fetchChainFusionEvmQuote,
	fetchChainFusionIcpQuote,
	fetchChainFusionIcpSwap
} from '$lib/services/chain-fusion-swap.services';
import { SwapProvider, type EvmQuoteParams, type IcpBridgeQuoteParams } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockValidIcCkToken,
	mockValidIcrcToken,
	mockValidIcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

let mockEnabled = true;

vi.mock('$env/chain-fusion-swap.env', () => ({
	get CHAIN_FUSION_SWAP_ENABLED() {
		return mockEnabled;
	}
}));

vi.mock('$icp/api/cketh-minter.api', () => ({
	eip1559TransactionPrice: vi.fn()
}));

vi.mock('$icp/services/ic-send.services', () => ({
	sendIc: vi.fn()
}));

const IC_CKETH_LEDGER = 'ss2fx-dyaaa-aaaar-qacoq-cai';
const IC_CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';
const LOCAL_CKUSDC_LEDGER = 'yfumr-cyaaa-aaaar-qaela-cai';

const MAX_TRANSACTION_FEE = 500_000n;
const CKETH_LEDGER_FEE = 2_000n;
const CK_LEDGER_FEE = 123n;

const AMOUNT = 1_000_000n;

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
			destinationAddress: mockEthAddress
		};

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
			vi.mocked(sendIc).mockResolvedValue({
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
			vi.mocked(sendIc).mockResolvedValue({ type: 'ckEthToEth', blockIndex: 1n });

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

			vi.mocked(sendIc).mockResolvedValue(result);

			await expect(
				fetchChainFusionIcpSwap({
					...swapParams,
					sourceToken: ckEthSource,
					destinationToken: ETHEREUM_TOKEN
				})
			).resolves.toStrictEqual(result);
		});
	});
});
