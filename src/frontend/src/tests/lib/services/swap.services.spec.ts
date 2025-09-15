import type { PoolMetadata } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import * as ethUtils from '$eth/utils/eth.utils';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import * as icpSwapPool from '$lib/api/icp-swap-pool.api';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import * as icpSwapBackend from '$lib/services/icp-swap.services';
import {
	fetchSwapAmounts,
	fetchSwapAmountsEVM,
	fetchVeloraDeltaSwap,
	fetchVeloraMarketSwap,
	loadKongSwapTokens,
	performManualWithdraw,
	withdrawICPSwapAfterFailedSwap,
	withdrawUserUnusedBalance
} from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import {
	SwapErrorCodes,
	SwapProvider,
	type SwapMappedResult,
	type VeloraSwapDetails
} from '$lib/types/swap';
import {
	geSwapEthTokenAddress,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { constructSimpleSDK } from '@velora-dex/sdk';
import { get } from 'svelte/store';

vi.mock(import('$env/icp-swap.env'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		ICP_SWAP_ENABLED: true
	};
});

vi.mock('$lib/api/kong_backend.api', () => ({
	kongSwapAmounts: vi.fn(),
	kongTokens: vi.fn()
}));

vi.mock('$lib/services/icp-swap.services', () => ({
	icpSwapAmounts: vi.fn()
}));

vi.mock('$lib/api/icp-swap-pool.api', () => ({
	withdraw: vi.fn(),
	getUserUnusedBalance: vi.fn(),
	getPoolMetadata: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('@velora-dex/sdk', () => ({
	constructSimpleSDK: vi.fn()
}));

vi.mock('$eth/services/send.services', () => ({
	approve: vi.fn(),
	erc20ContractAllowance: vi.fn()
}));

vi.mock('$eth/services/swap.services', () => ({
	swap: vi.fn()
}));

vi.mock('$eth/utils/eip712.utils', () => ({
	getCompactSignature: vi.fn(() => 'mock-signature'),
	getSignParamsEIP712: vi.fn(() => 'mock-hash')
}));

vi.mock('$eth/utils/eth.utils', () => ({
	isDefaultEthereumToken: vi.fn(() => false)
}));

vi.mock('$lib/api/signer.api', () => ({
	signPrehash: vi.fn(() => Promise.resolve('mock-signature'))
}));

vi.mock('$lib/utils/swap.utils', async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...(actual as Record<string, unknown>),
		geSwapEthTokenAddress: vi.fn(),

		mapVeloraSwapResult: vi.fn(
			(): SwapMappedResult => ({
				provider: SwapProvider.VELORA,
				receiveAmount: 1n,
				receiveOutMinimum: 2n,
				swapDetails: {} as VeloraSwapDetails,
				type: 'delta'
			})
		),

		mapVeloraMarketSwapResult: vi.fn(
			(): SwapMappedResult => ({
				provider: SwapProvider.VELORA,
				receiveAmount: 1n,
				receiveOutMinimum: 2n,
				swapDetails: {} as VeloraSwapDetails,
				type: 'market'
			})
		)
	};
});

describe('fetchSwapAmounts', () => {
	const mockTokens = [mockValidIcToken as IcToken, mockValidIcrcToken as IcToken];

	const [sourceToken] = mockTokens;
	const [_, destinationToken] = mockTokens;
	const amount = 1000;
	const slippage = 0.5;

	it('should handle both KONG_SWAP and ICP_SWAP providers correctly', async () => {
		const kongSwapResponse = {
			receive_amount: 950n,
			slippage: 0.5
		} as SwapAmountsReply;
		const icpSwapResponse = {
			receiveAmount: 975
		} as unknown as ICPSwapAmountReply;

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage,
			isSourceTokenIcrc2: true,
			userEthAddress: mockEthAddress
		});

		expect(result).toHaveLength(2);

		const kongSwapResult = result.find((r) => r.provider === SwapProvider.KONG_SWAP);
		const icpSwapResult = result.find((r) => r.provider === SwapProvider.ICP_SWAP);

		expect(kongSwapResult).toBeDefined();
		expect(kongSwapResult?.receiveAmount).toBe(kongSwapResponse.receive_amount);

		expect(icpSwapResult).toBeDefined();
		expect(icpSwapResult?.receiveAmount).toBe(icpSwapResponse.receiveAmount);
	});

	it('should handle provider failures gracefully (e.g., rejected promises)', async () => {
		const kongSwapResponse = { receive_amount: 950n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapError = new Error('ICP Swap Error');

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockRejectedValue(icpSwapError);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage,
			isSourceTokenIcrc2: true,
			userEthAddress: mockEthAddress
		});

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
	});

	it('should filter out providers with receiveAmount = 0', async () => {
		const kongSwapResponse = { receive_amount: 0n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapResponse = {
			receiveAmount: 950n,
			slippage: 0.5
		} as unknown as ICPSwapAmountReply;

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage,
			isSourceTokenIcrc2: true,
			userEthAddress: mockEthAddress
		});

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
	});

	it('should sort results by receiveAmount in descending order', async () => {
		const kongSwapResponse = { receive_amount: 800n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapResponse = { receiveAmount: 950n, slippage: 0.5 } as unknown as ICPSwapAmountReply;

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage,
			isSourceTokenIcrc2: true,
			userEthAddress: mockEthAddress
		});

		expect(result).toHaveLength(2);
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
		expect(result[1].provider).toBe(SwapProvider.KONG_SWAP);
	});

	it('should skip icp swap if token is icrc1', async () => {
		const kongSwapResponse = { receive_amount: 800n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapResponse = { receiveAmount: 950n, slippage: 0.5 } as unknown as ICPSwapAmountReply;

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage,
			isSourceTokenIcrc2: false,
			userEthAddress: mockEthAddress
		});

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
	});

	it('should call fetchSwapAmountsEVM when network.id !== ICP_NETWORK_ID', async () => {
		const mockGetQuote = vi.fn();

		vi.mocked(constructSimpleSDK).mockReturnValue({
			quote: { getQuote: mockGetQuote }
		} as unknown as ReturnType<typeof constructSimpleSDK>);

		mockGetQuote.mockResolvedValue({});

		const evmToken = {
			...mockValidErc20Token,
			network: {
				id: Symbol('evm-network-id'),
				env: 'mainnet',
				name: 'EVM Network',
				chainId: 1n
			}
		} as Erc20Token;

		await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken: evmToken,
			destinationToken: mockValidErc20Token,
			amount: 1000,
			tokens: [evmToken, mockValidErc20Token],
			slippage: 0.5,
			isSourceTokenIcrc2: true,
			userEthAddress: '0xUser'
		});

		expect(mockGetQuote).toHaveBeenCalled();
	});
});

describe('fetchSwapAmountsEVM', () => {
	const sourceToken = {
		symbol: 'SRC',
		decimals: 18,
		network: { chainId: '1' },
		address: '0xSrcAddress'
	} as unknown as Erc20Token;

	const destinationToken = {
		symbol: 'DST',
		decimals: 6,
		network: { chainId: '137' },
		address: '0xDestAddress'
	} as unknown as Erc20Token;

	const amount = BigInt('1000000000000000000');
	const userEthAddress = '0xUser';

	const mockGetQuote = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(constructSimpleSDK).mockReturnValue({
			quote: { getQuote: mockGetQuote }
		} as unknown as ReturnType<typeof constructSimpleSDK>);
	});

	afterEach(() => {
		mockGetQuote.mockReset();
	});

	it('returns [] when quote has neither delta nor market', async () => {
		mockGetQuote.mockResolvedValue({});

		const result = await fetchSwapAmountsEVM({
			sourceToken,
			destinationToken,
			amount,
			userEthAddress
		});

		expect(mapVeloraSwapResult).not.toHaveBeenCalled();
		expect(mapVeloraMarketSwapResult).not.toHaveBeenCalled();
		expect(result).toEqual([]);
	});

	it('calls delta mapper when quote contains delta and returns single-item array', async () => {
		mockGetQuote.mockResolvedValue({ delta: { receiveAmount: '123' } });

		const result = await fetchSwapAmountsEVM({
			sourceToken,
			destinationToken,
			amount,
			userEthAddress
		});

		expect(geSwapEthTokenAddress).toHaveBeenCalledTimes(2);
		expect(mapVeloraSwapResult).toHaveBeenCalledOnce();
		expect(mapVeloraMarketSwapResult).not.toHaveBeenCalled();
		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.VELORA);
	});

	it('calls market mapper when quote contains market and returns single-item array', async () => {
		mockGetQuote.mockResolvedValue({ market: { receiveAmount: '456' } });

		const result = await fetchSwapAmountsEVM({
			sourceToken,
			destinationToken,
			amount,
			userEthAddress
		});

		expect(mapVeloraMarketSwapResult).toHaveBeenCalledOnce();
		expect(mapVeloraSwapResult).not.toHaveBeenCalled();
		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.VELORA);
	});
});

describe('fetchVeloraDeltaSwap', () => {
	const mockSourceToken = {
		...mockValidErc20Token,
		address: mockEthAddress,
		decimals: 18
	};

	const mockDestinationToken = {
		...mockValidErc20Token,
		address: '0xDestinationToken',
		decimals: 6
	};

	const mockSwapAmount = '1000000000000000000'; // 1 ETH
	const mockReceiveAmount = 900000000n; // 0.9 DST
	const mockSlippageValue = '0.5';
	const mockSourceNetwork = ETHEREUM_NETWORK;
	const mockDestinationNetwork = SEPOLIA_NETWORK;
	const mockUserAddress = mockEthAddress;
	const mockGas = '21000';
	const mockMaxFeePerGas = '20000000000';
	const mockMaxPriorityFeePerGas = '2000000000';

	const mockSwapDetails = {
		srcToken: mockEthAddress,
		destToken: '0xDestinationToken',
		srcAmount: '1000000000000000000',
		destAmount: '900000000',
		destAmountBeforeFee: '920000000',
		gasCost: '50000',
		gasCostBeforeFee: '48000',
		gasCostUSD: '15.5',
		gasCostUSDBeforeFee: '14.8',
		srcUSD: '1000.0',
		destUSD: '895.5',
		destUSDBeforeFee: '915.2',
		partner: 'PartnerName',
		partnerFee: 0.25,
		hmac: 'abcd1234',
		// BridgePrice properties
		destAmountAfterBridge: '800000000',
		destUSDAfterBridge: '795.0',
		bridgeFee: '50',
		bridgeFeeUSD: '50.0',
		poolAddress: '0xpool123',
		bridge: {
			destinationChainId: 1,
			outputToken: '0xoutput456',
			protocolSelector: 'bridge_protocol',
			scalingFactor: 1000000,
			protocolData: '0xprotocol_data'
		},
		bridgeInfo: {
			destAmountAfterBridge: '800000000',
			destUSDAfterBridge: '795.0',
			bridgeFee: '50',
			bridgeFeeUSD: '50.0',
			poolAddress: '0xpool123',
			protocolName: 'bridge_protocol',
			fees: [
				{
					name: 'bridge_fee',
					amount: '50',
					amountUSD: '50.0',
					feeToken: '0xoutput456',
					amountInSrcToken: '50',
					amountInUSD: '50.0'
				}
			],
			estimatedTimeMs: 300000
		},
		// OptimalRate properties
		blockNumber: 12345,
		networkFee: '1000000000000000000',
		networkFeeUSD: '100.0',
		network: 1,
		srcDecimals: 18,
		destDecimals: 6,
		bestRoute: [
			{
				percent: 100,
				swaps: [
					{
						srcToken: mockEthAddress,
						srcDecimals: 18,
						destToken: '0xDestinationToken',
						destDecimals: 6,
						exchange: 'uniswap_v2',
						percent: 100,
						swapExchanges: [
							{
								exchange: 'uniswap_v2',
								percent: 100,
								srcAmount: '1000000000000000000',
								destAmount: '900000000'
							}
						]
					}
				]
			}
		],
		side: 'SELL' as const,
		version: '2',
		contractMethod: 'swap',
		tokenTransferProxy: '0xTokenTransferProxy',
		contractAddress: '0xSwapContract'
	};

	const mockProgress = vi.fn();

	let mockSdk: {
		delta: {
			getDeltaContract: ReturnType<typeof vi.fn>;
			buildDeltaOrder: ReturnType<typeof vi.fn>;
			postDeltaOrder: ReturnType<typeof vi.fn>;
			getDeltaOrderById: ReturnType<typeof vi.fn>;
		};
	};
	let mockDeltaContract: {
		getDeltaContract: ReturnType<typeof vi.fn>;
		buildDeltaOrder: ReturnType<typeof vi.fn>;
		postDeltaOrder: ReturnType<typeof vi.fn>;
		getDeltaOrderById: ReturnType<typeof vi.fn>;
	};
	let mockDeltaContractGetDeltaContract: ReturnType<typeof vi.fn>;
	let mockDeltaContractBuildDeltaOrder: ReturnType<typeof vi.fn>;
	let mockDeltaContractPostDeltaOrder: ReturnType<typeof vi.fn>;
	let mockDeltaContractGetDeltaOrderById: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockDeltaContractGetDeltaOrderById = vi.fn();
		mockDeltaContractPostDeltaOrder = vi.fn();
		mockDeltaContractBuildDeltaOrder = vi.fn();
		mockDeltaContractGetDeltaContract = vi.fn();

		mockDeltaContract = {
			getDeltaContract: mockDeltaContractGetDeltaContract,
			buildDeltaOrder: mockDeltaContractBuildDeltaOrder,
			postDeltaOrder: mockDeltaContractPostDeltaOrder,
			getDeltaOrderById: mockDeltaContractGetDeltaOrderById
		};

		mockSdk = {
			delta: mockDeltaContract
		};

		vi.mocked(constructSimpleSDK).mockReturnValue(
			mockSdk as unknown as ReturnType<typeof constructSimpleSDK>
		);
		mockDeltaContractGetDeltaContract.mockResolvedValue(mockDeltaContract);
		mockDeltaContractBuildDeltaOrder.mockResolvedValue({
			data: { order: 'mock-order-data' }
		});
		mockDeltaContractPostDeltaOrder.mockResolvedValue({ id: 'mock-auction-id' });
		mockDeltaContractGetDeltaOrderById.mockResolvedValue({
			status: 'EXECUTED',
			order: { bridge: { destinationChainId: 0 } }
		});
	});

	it('should execute delta swap successfully', async () => {
		await fetchVeloraDeltaSwap({
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken: mockSourceToken,
			destinationToken: mockDestinationToken,
			swapAmount: mockSwapAmount,
			sourceNetwork: mockSourceNetwork,
			receiveAmount: mockReceiveAmount,
			slippageValue: mockSlippageValue,
			destinationNetwork: mockDestinationNetwork,
			userAddress: mockUserAddress,
			gas: BigInt(mockGas),
			maxFeePerGas: BigInt(mockMaxFeePerGas),
			maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
			swapDetails: mockSwapDetails as VeloraSwapDetails
		});

		expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
		expect(mockDeltaContractGetDeltaContract).toHaveBeenCalled();
		expect(mockDeltaContractPostDeltaOrder).toHaveBeenCalledWith({
			order: { order: 'mock-order-data' },
			signature: 'mock-signature'
		});
	});

	it('should handle delta contract not found', async () => {
		mockDeltaContractGetDeltaContract.mockResolvedValue(null);

		await fetchVeloraDeltaSwap({
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken: mockSourceToken,
			destinationToken: mockDestinationToken,
			swapAmount: mockSwapAmount,
			sourceNetwork: mockSourceNetwork,
			receiveAmount: mockReceiveAmount,
			slippageValue: mockSlippageValue,
			destinationNetwork: mockDestinationNetwork,
			userAddress: mockUserAddress,
			gas: BigInt(mockGas),
			maxFeePerGas: BigInt(mockMaxFeePerGas),
			maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
			swapDetails: mockSwapDetails as VeloraSwapDetails
		});

		expect(mockProgress).not.toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		expect(mockDeltaContractPostDeltaOrder).not.toHaveBeenCalled();
	});

	it('should handle cross-chain bridge execution', async () => {
		mockDeltaContractGetDeltaOrderById.mockResolvedValue({
			status: 'EXECUTED',
			order: { bridge: { destinationChainId: 1 } },
			bridgeStatus: 'filled'
		});

		await fetchVeloraDeltaSwap({
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken: mockSourceToken,
			destinationToken: mockDestinationToken,
			swapAmount: mockSwapAmount,
			sourceNetwork: mockSourceNetwork,
			receiveAmount: mockReceiveAmount,
			slippageValue: mockSlippageValue,
			destinationNetwork: mockDestinationNetwork,
			userAddress: mockUserAddress,
			gas: BigInt(mockGas),
			maxFeePerGas: BigInt(mockMaxFeePerGas),
			maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
			swapDetails: mockSwapDetails as VeloraSwapDetails
		});

		expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
	});
});

describe('fetchVeloraMarketSwap', () => {
	const mockSourceToken = {
		...mockValidErc20Token,
		address: mockEthAddress,
		decimals: 18
	};

	const mockDestinationToken = {
		...mockValidErc20Token,
		address: '0xDestinationToken',
		decimals: 6
	};

	const mockSwapAmount = '1000000000000000000';
	const mockSlippageValue = '0.5';
	const mockSourceNetwork = ETHEREUM_NETWORK;
	const mockUserAddress = mockEthAddress;
	const mockGas = '21000';
	const mockMaxFeePerGas = '20000000000';
	const mockMaxPriorityFeePerGas = '2000000000';

	const mockSwapDetails = {
		srcToken: mockEthAddress,
		destToken: '0xDestinationToken',
		srcAmount: '1000000000000000000',
		destAmount: '900000000',
		destAmountBeforeFee: '920000000',
		gasCost: '50000',
		gasCostBeforeFee: '48000',
		gasCostUSD: '15.5',
		gasCostUSDBeforeFee: '14.8',
		srcUSD: '1000.0',
		destUSD: '895.5',
		destUSDBeforeFee: '915.2',
		partner: 'PartnerName',
		partnerFee: 0.25,
		hmac: 'abcd1234'
	};

	const mockProgress = vi.fn();

	let mockSdk: {
		swap: {
			getSpender: ReturnType<typeof vi.fn>;
			buildTx: ReturnType<typeof vi.fn>;
		};
	};
	let mockSwap: {
		getSpender: ReturnType<typeof vi.fn>;
		buildTx: ReturnType<typeof vi.fn>;
	};
	let mockSwapGetSpender: ReturnType<typeof vi.fn>;
	let mockSwapBuildTx: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSwapGetSpender = vi.fn();
		mockSwapBuildTx = vi.fn();

		mockSwap = {
			getSpender: mockSwapGetSpender,
			buildTx: mockSwapBuildTx
		};

		mockSdk = {
			swap: mockSwap
		};

		vi.mocked(constructSimpleSDK).mockReturnValue(
			mockSdk as unknown as ReturnType<typeof constructSimpleSDK>
		);
		mockSwapGetSpender.mockResolvedValue('0xTokenTransferProxy');
		mockSwapBuildTx.mockResolvedValue({
			to: '0xSwapContract',
			data: '0xswapdata'
		});
	});

	it('should execute market swap successfully with non-default token', async () => {
		await fetchVeloraMarketSwap({
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken: mockSourceToken,
			destinationToken: mockDestinationToken,
			swapAmount: mockSwapAmount,
			sourceNetwork: mockSourceNetwork,
			slippageValue: mockSlippageValue,
			userAddress: mockUserAddress,
			gas: BigInt(mockGas),
			maxFeePerGas: BigInt(mockMaxFeePerGas),
			maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
			swapDetails: mockSwapDetails as VeloraSwapDetails,
			receiveAmount: BigInt(1000),
			destinationNetwork: SEPOLIA_NETWORK
		});

		expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
		expect(mockSwapGetSpender).toHaveBeenCalled();
	});

	it('should execute market swap successfully with default Ethereum token', async () => {
		vi.mocked(ethUtils.isDefaultEthereumToken).mockReturnValue(true);

		await fetchVeloraMarketSwap({
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken: mockSourceToken,
			destinationToken: mockDestinationToken,
			swapAmount: mockSwapAmount,
			sourceNetwork: mockSourceNetwork,
			slippageValue: mockSlippageValue,
			userAddress: mockUserAddress,
			gas: BigInt(mockGas),
			maxFeePerGas: BigInt(mockMaxFeePerGas),
			maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
			swapDetails: mockSwapDetails as VeloraSwapDetails,
			receiveAmount: BigInt(1000),
			destinationNetwork: SEPOLIA_NETWORK
		});

		expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
		expect(mockSwapGetSpender).toHaveBeenCalled();
		expect(mockSwapBuildTx).toHaveBeenCalled();
	});
});

describe('loadKongSwapTokens', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('properly updates kongSwapToken store with the fetched tokens', async () => {
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);

		await loadKongSwapTokens({ identity: mockIdentity });

		expect(get(kongSwapTokensStore)).toStrictEqual({
			[kongIcToken.symbol]: kongIcToken
		});
	});

	it('properly does not update store if no IC kongTokens available', async () => {
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue([{ ...mockKongBackendTokens[1] }]);

		await loadKongSwapTokens({ identity: mockIdentity });

		expect(get(kongSwapTokensStore)).toStrictEqual({});
	});
});

describe('withdrawICPSwapAfterFailedSwap', () => {
	const identity = mockIdentity;
	const canisterId = 'test-canister-id';
	const tokenId = 'icp';
	const amount = 1000n;
	const fee = 10n;
	const sourceToken = mockValidIcToken as IcTokenToggleable;
	const destinationToken = mockValidIcrcToken as IcTokenToggleable;

	const baseParams = {
		identity,
		canisterId,
		tokenId,
		amount,
		fee,
		sourceToken,
		destinationToken
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should succeed on first withdraw attempt', async () => {
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(100n);

		const result = await withdrawICPSwapAfterFailedSwap(baseParams);

		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS);
	});

	it('succeeds on second attempt via unused balance (real path)', async () => {
		vi.mocked(icpSwapPool.withdraw).mockRejectedValueOnce(new Error('fail'));

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 100n,
			balance1: 0n
		});

		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(100n);

		const result = await withdrawICPSwapAfterFailedSwap({
			...baseParams,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(2);
		expect(icpSwapPool.withdraw).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				identity,
				canisterId,
				token: sourceToken.ledgerCanisterId,
				amount: 100n,
				fee: sourceToken.fee
			})
		);
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_2ND_WITHDRAW_SUCCESS);
	});

	it('should return failed code if both attempts fail and call setFailedProgressStep (real path)', async () => {
		const setFailedProgressStep = vi.fn();

		vi.mocked(icpSwapPool.withdraw).mockRejectedValueOnce(new Error('fail1'));

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 0n
		});

		const result = await withdrawICPSwapAfterFailedSwap({
			...baseParams,
			setFailedProgressStep,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.WITHDRAW);
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED);
	});
});

describe('performManualWithdraw', () => {
	const identity = mockIdentity;
	const canisterId = 'test-canister-id';
	const sourceToken = mockValidIcToken as IcTokenToggleable;
	const destinationToken = mockValidIcrcToken as IcTokenToggleable;

	const baseParams = {
		withdrawDestinationTokens: true,
		identity,
		canisterId,
		sourceToken,
		destinationToken
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should track success event and return success code', async () => {
		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 1n,
			balance1: 0n
		});
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(1n);

		const result = await performManualWithdraw(baseParams);

		expect(icpSwapPool.getPoolMetadata).toHaveBeenCalledOnce();
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: destinationToken.symbol,
				tokenDirection: 'receive',
				dApp: SwapProvider.ICP_SWAP
			}
		});
		expect(result.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS);
		expect(result.message).toBeDefined();
	});

	it('should track failed event, call setFailedProgressStep and return error code', async () => {
		const setFailedProgressStep = vi.fn();

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 0n
		});

		const result = await performManualWithdraw({
			...baseParams,
			setFailedProgressStep
		});

		expect(icpSwapPool.getPoolMetadata).toHaveBeenCalledOnce();
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).not.toHaveBeenCalled();

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			metadata: {
				token: destinationToken.symbol,
				tokenDirection: 'receive',
				dApp: SwapProvider.ICP_SWAP
			}
		});
		expect(setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.WITHDRAW);
		expect(result.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED);
		expect(result.variant).toBe('error');
	});

	it('should track tokenDirection correctly when withdrawDestinationTokens is false', async () => {
		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 1n
		});
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(1n);

		await performManualWithdraw({
			...baseParams,
			withdrawDestinationTokens: false
		});

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: sourceToken.symbol,
				tokenDirection: 'pay',
				dApp: SwapProvider.ICP_SWAP
			}
		});
	});
});

describe('withdrawUserUnusedBalance', () => {
	const identity = mockIdentity;
	const canisterId = 'test-canister-id';

	const sourceToken = mockValidIcToken as IcTokenToggleable;

	const destinationToken = mockValidIcrcToken as IcTokenToggleable;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should withdraw both tokens if both balances are non-zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 1000n,
			balance1: 2000n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await withdrawUserUnusedBalance({
			identity,
			canisterId,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(2);
	});

	it('should reject if both balances are zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 0n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await expect(
			withdrawUserUnusedBalance({
				identity,
				canisterId,
				sourceToken,
				destinationToken
			})
		).rejects.toThrow('No unused balance to withdraw');

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).not.toHaveBeenCalled();
	});

	it('should only withdraw destinationToken if only balance0 is non-zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 1500n,
			balance1: 0n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await withdrawUserUnusedBalance({
			identity,
			canisterId,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledWith({
			identity,
			canisterId,
			token: destinationToken.ledgerCanisterId,
			amount: 1500n,
			fee: destinationToken.fee
		});
	});

	it('should only withdraw sourceToken if only balance1 is non-zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 1500n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await withdrawUserUnusedBalance({
			identity,
			canisterId,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledWith({
			identity,
			canisterId,
			token: sourceToken.ledgerCanisterId,
			amount: 1500n,
			fee: sourceToken.fee
		});
	});
});
