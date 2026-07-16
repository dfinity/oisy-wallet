import type { PoolMetadata } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { createPermit } from '$eth/services/eip2612-permit.services';
import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { send as sendEvm } from '$eth/services/send.services';
import type { Erc20Token } from '$eth/types/erc20';
import * as ethUtils from '$eth/utils/eth.utils';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { setCustomToken } from '$lib/api/backend.api';
import * as icpSwapPool from '$lib/api/icp-swap-pool.api';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENTS, PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import * as icpSwapBackend from '$lib/services/icp-swap.services';
import * as nearIntentsServices from '$lib/services/near-intents.services';
import * as oneSecSwapServices from '$lib/services/onesec-swap.services';
import {
	fetchNearIntentsEvmSwap,
	fetchNearIntentsSolSwap,
	fetchOneSecEvmToIcpSwap,
	fetchOneSecIcpToEvmSwap,
	fetchSwapAmounts,
	fetchSwapAmountsEVM,
	fetchSwapAmountsSOL,
	fetchVeloraDeltaSwap,
	fetchVeloraMarketSwap,
	loadKongSwapTokens,
	performManualWithdraw,
	withdrawICPSwapAfterFailedSwap,
	withdrawUserUnusedBalance
} from '$lib/services/swap.services';
import { fetchVeloraSwapAmount } from '$lib/services/velora-swap.services';
import { exchangeStore } from '$lib/stores/exchange.store';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import { SwapErrorCodes, SwapProvider, type VeloraSwapDetails } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
import { sendSol } from '$sol/services/sol-send.services';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockVeloraSwapDetails } from '$tests/mocks/velora.mock';
import { constructSimpleSDK } from '@velora-dex/sdk';
import { get } from 'svelte/store';

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: vi.fn()
}));

vi.mock('$lib/api/kong_backend.api', () => ({
	kongSwapAmounts: vi.fn(),
	kongTokens: vi.fn()
}));

vi.mock('$lib/services/icp-swap.services', () => ({
	icpSwapAmounts: vi.fn(),
	icpSwapSupportedTokens: vi.fn()
}));

vi.mock('$lib/api/icp-swap-pool.api', () => ({
	withdraw: vi.fn(),
	getUserUnusedBalance: vi.fn(),
	getPoolMetadata: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const mockVeloraGetQuote = vi.hoisted(() => vi.fn());
const mockSolGetQuote = vi.hoisted(() => vi.fn());
const mockIcpBridgeGetQuote = vi.hoisted(() => vi.fn());

vi.mock('$lib/providers/evm-swap.providers', () => ({
	evmSwapProviders: [
		{
			key: 'velora',
			getQuote: mockVeloraGetQuote,
			isEnabled: true
		}
	]
}));

vi.mock('$lib/providers/sol-swap.providers', () => ({
	solSwapProviders: [
		{
			key: 'near_intents',
			getQuote: mockSolGetQuote,
			isEnabled: true
		}
	]
}));

vi.mock('$lib/providers/icp-bridge-swap.providers', () => ({
	icpBridgeProviders: [
		{
			key: 'one_sec',
			getQuote: mockIcpBridgeGetQuote,
			isEnabled: true
		}
	]
}));

vi.mock('$lib/services/onesec-swap.services', () => ({
	executeOneSecEvmToIcpBridge: vi.fn(),
	executeOneSecIcpToEvmBridge: vi.fn()
}));

vi.mock('$lib/services/near-intents.services', () => ({
	fetchNearIntentsSwapQuote: vi.fn(),
	submitNearIntentsDepositTx: vi.fn(),
	pollNearIntentsStatus: vi.fn()
}));

vi.mock('$eth/services/send.services', () => ({
	send: vi.fn()
}));

vi.mock('$sol/services/sol-send.services', () => ({
	sendSol: vi.fn()
}));

vi.mock('@velora-dex/sdk', () => ({
	constructSimpleSDK: vi.fn()
}));

vi.mock('$eth/services/approve.services', () => ({
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

vi.mock('$eth/utils/eth.utils', async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...(actual as Record<string, unknown>),
		isNotDefaultEthereumToken: vi.fn(() => true)
	};
});

vi.mock('$lib/api/signer.api', () => ({
	signPrehash: vi.fn(() => Promise.resolve('mock-signature'))
}));

vi.mock('$lib/utils/swap.utils', async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...(actual as Record<string, unknown>),
		geSwapEthTokenAddress: vi.fn()
	};
});

vi.mock('$eth/services/eip2612-permit.services', () => ({
	createPermit: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	setCustomToken: vi.fn()
}));

vi.mock('$eth/services/erc20.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$sol/services/spl.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$env/rest/kongswap.env', () => ({
	KONGSWAP_PROVIDER_ENABLED: true
}));

describe('swap.services', () => {
	describe('fetchSwapAmounts', () => {
		const mockTokens = [mockValidIcToken as IcToken, mockValidIcrcToken as IcToken];

		const [sourceToken] = mockTokens;
		const [_, destinationToken] = mockTokens;
		const amount = 1000;
		const slippage = 0.5;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should handle both KONG_SWAP and ICP_SWAP providers correctly', async () => {
			const kongSwapResponse = {
				receive_amount: 950n,
				slippage: 0.5
			} as SwapAmountsReply;
			const icpSwapResponse = {
				receiveAmount: 975n
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
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(result).toHaveLength(2);

			const kongSwapResult = result.find((r) => r.provider === SwapProvider.KONG_SWAP);
			const icpSwapResult = result.find((r) => r.provider === SwapProvider.ICP_SWAP);

			expect(kongSwapResult).toBeDefined();
			expect(kongSwapResult?.receiveAmount).toBe(kongSwapResponse.receive_amount);

			expect(icpSwapResult).toBeDefined();
			expect(icpSwapResult?.receiveAmount).toBe(
				icpSwapResponse.receiveAmount - destinationToken.fee
			);
		});

		it('should make a call oly to icpSwap if icrc2 is false', async () => {
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
				isSourceTokenIcrc2: false,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(result).toHaveLength(1);

			const kongSwapResult = result.find((r) => r.provider === SwapProvider.KONG_SWAP);

			expect(kongSwapResult).toBeDefined();
		});

		it('should not make a call to ledger to get icrc token supported standards', async () => {
			const kongSwapResponse = {
				receive_amount: 950n,
				slippage: 0.5
			} as SwapAmountsReply;
			const icpSwapResponse = {
				receiveAmount: 975n
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
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(icrcLedgerApi.icrc1SupportedStandards).toHaveBeenCalledTimes(0);

			expect(result).toHaveLength(2);

			const kongSwapResult = result.find((r) => r.provider === SwapProvider.KONG_SWAP);
			const icpSwapResult = result.find((r) => r.provider === SwapProvider.ICP_SWAP);

			expect(kongSwapResult).toBeDefined();
			expect(kongSwapResult?.receiveAmount).toBe(kongSwapResponse.receive_amount);

			expect(icpSwapResult).toBeDefined();
			expect(icpSwapResult?.receiveAmount).toBe(
				icpSwapResponse.receiveAmount - destinationToken.fee
			);
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
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(result).toHaveLength(1);
			expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
		});

		it('should filter out providers with receiveAmount = 0', async () => {
			const kongSwapResponse = { receive_amount: ZERO, slippage: 0.5 } as SwapAmountsReply;
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
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(result).toHaveLength(1);
			expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
		});

		it('should sort results by receiveAmount in descending order', async () => {
			const kongSwapResponse = { receive_amount: 800n, slippage: 0.5 } as SwapAmountsReply;
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
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(result).toHaveLength(2);
			expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
			expect(result[1].provider).toBe(SwapProvider.KONG_SWAP);
		});

		it('should skip icp swap if token is icrc1', async () => {
			const kongSwapResponse = { receive_amount: 800n, slippage: 0.5 } as SwapAmountsReply;
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
				isSourceTokenIcrc2: false,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(result).toHaveLength(1);
			expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
		});

		it('should call fetchSwapAmountsEVM when network.id !== ICP_NETWORK_ID', async () => {
			mockVeloraGetQuote.mockResolvedValue(undefined);

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
				userEthAddress: '0xUser',
				userSolAddress: undefined
			});

			expect(mockVeloraGetQuote).toHaveBeenCalled();
		});

		describe('with ICP source and non-ICP destination', () => {
			const icpSource = mockValidIcToken as IcToken;
			const evmDest = { ...mockValidErc20Token, network: ETHEREUM_NETWORK } as Erc20Token;

			beforeEach(() => {
				vi.clearAllMocks();
			});

			it('routes to fetchSwapAmountsICPBridge and calls icpBridgeProviders', async () => {
				mockIcpBridgeGetQuote.mockResolvedValue({
					provider: SwapProvider.ONE_SEC,
					receiveAmount: 500n,
					swapDetails: { transferFeeInUnits: 1000n, protocolFeeInPercent: 0.1 }
				});

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: icpSource,
					destinationToken: evmDest,
					amount: 1000,
					tokens: [icpSource, evmDest],
					slippage: 0.5,
					isSourceTokenIcrc2: true,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined
				});

				expect(mockIcpBridgeGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						sourceToken: icpSource,
						destinationToken: evmDest,
						userEthAddress: mockEthAddress
					})
				);
				expect(result).toHaveLength(1);
				expect(result[0].provider).toBe(SwapProvider.ONE_SEC);
			});

			it('does NOT call icpBridgeProviders when both source and destination are ICP', async () => {
				vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue({
					receive_amount: 100n,
					slippage: 0.5
				} as SwapAmountsReply);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: icpSource,
					destinationToken: mockValidIcrcToken as IcToken,
					amount: 1000,
					tokens: [icpSource, mockValidIcrcToken as IcToken],
					slippage: 0.5,
					isSourceTokenIcrc2: false,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined
				});

				expect(mockIcpBridgeGetQuote).not.toHaveBeenCalled();
			});

			it('returns [] when all ICP bridge providers return undefined', async () => {
				mockIcpBridgeGetQuote.mockResolvedValue(undefined);

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: icpSource,
					destinationToken: evmDest,
					amount: 1000,
					tokens: [icpSource, evmDest],
					slippage: 0.5,
					isSourceTokenIcrc2: true,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined
				});

				expect(result).toEqual([]);
			});

			it('skips a provider whose quote rejects and returns remaining results', async () => {
				mockIcpBridgeGetQuote.mockRejectedValue(new Error('OneSec error'));

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: icpSource,
					destinationToken: evmDest,
					amount: 1000,
					tokens: [icpSource, evmDest],
					slippage: 0.5,
					isSourceTokenIcrc2: true,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined
				});

				expect(result).toEqual([]);
			});
		});

		describe('with Solana tokens', () => {
			const solSourceToken = mockValidSplToken;
			const evmDestToken = {
				...mockValidErc20Token,
				network: ETHEREUM_NETWORK
			} as Erc20Token;

			beforeEach(() => {
				vi.clearAllMocks();
			});

			it('should route to fetchSwapAmountsSOLana when source token is Solana', async () => {
				mockSolGetQuote.mockResolvedValue({
					provider: SwapProvider.NEAR_INTENTS,
					receiveAmount: 500n,
					receiveOutMinimum: 490n,
					swapDetails: {} as NearIntentsQuoteResponse
				});

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: solSourceToken,
					destinationToken: evmDestToken,
					amount: 100,
					tokens: [solSourceToken, evmDestToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress
				});

				expect(result).toHaveLength(1);
				expect(result[0].provider).toBe(SwapProvider.NEAR_INTENTS);
				expect(mockSolGetQuote).toHaveBeenCalled();
			});

			it('should route to fetchSwapAmountsSOLana when destination token is Solana', async () => {
				mockSolGetQuote.mockResolvedValue({
					provider: SwapProvider.NEAR_INTENTS,
					receiveAmount: 500n,
					receiveOutMinimum: 490n,
					swapDetails: {} as NearIntentsQuoteResponse
				});

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmDestToken,
					destinationToken: solSourceToken,
					amount: 100,
					tokens: [evmDestToken, solSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress
				});

				expect(result).toHaveLength(1);
				expect(result[0].provider).toBe(SwapProvider.NEAR_INTENTS);
			});

			it('should return [] when source is Solana and userSolAddress is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: solSourceToken,
					destinationToken: evmDestToken,
					amount: 100,
					tokens: [solSourceToken, evmDestToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined
				});

				expect(result).toEqual([]);
				expect(mockSolGetQuote).not.toHaveBeenCalled();
			});

			it('should use userEthAddress as source when dest is Solana and source is EVM', async () => {
				mockSolGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmDestToken,
					destinationToken: solSourceToken,
					amount: 100,
					tokens: [evmDestToken, solSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress
				});

				expect(mockSolGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockEthAddress
					})
				);
			});
		});
	});

	describe('fetchSwapAmountsEVM', () => {
		const sourceToken: Erc20Token = {
			...mockValidErc20Token,
			symbol: 'SRC',
			decimals: 18,
			network: { ...mockValidErc20Token.network, chainId: 1n },
			address: '0xSrcAddress'
		};

		const destinationToken: Erc20Token = {
			...mockValidErc20Token,
			symbol: 'DST',
			decimals: 6,
			network: { ...mockValidErc20Token.network, chainId: 137n },
			address: '0xDestAddress'
		};

		const amount = BigInt('1000000000000000000');
		const userAddress = '0xUser';
		const slippage = 1.5;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns [] when all providers return undefined', async () => {
			mockVeloraGetQuote.mockResolvedValue(undefined);

			const result = await fetchSwapAmountsEVM({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(result).toEqual([]);
		});

		it('returns provider results and passes params correctly', async () => {
			mockVeloraGetQuote.mockResolvedValue({
				provider: SwapProvider.VELORA,
				receiveAmount: 123n,
				swapDetails: {},
				type: 'delta'
			});

			const result = await fetchSwapAmountsEVM({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(mockVeloraGetQuote).toHaveBeenCalledWith({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});
			expect(result).toHaveLength(1);
			expect(result[0].provider).toBe(SwapProvider.VELORA);
			expect(result[0].receiveAmount).toBe(123n);
			expect(result[0].type).toBe('delta');
		});

		it('returns [] when userAddress is nullish', async () => {
			const result = await fetchSwapAmountsEVM({
				sourceToken,
				destinationToken,
				amount,
				userAddress: undefined,
				slippage
			});

			expect(mockVeloraGetQuote).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});

		it('sorts results by receiveAmount descending', async () => {
			mockVeloraGetQuote.mockResolvedValue({
				provider: SwapProvider.VELORA,
				receiveAmount: 100n,
				swapDetails: {},
				type: 'delta'
			});

			const result = await fetchSwapAmountsEVM({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(result).toHaveLength(1);
			expect(result[0].receiveAmount).toBe(100n);
		});

		it('skips providers whose quote rejects', async () => {
			mockVeloraGetQuote.mockRejectedValue(new Error('Velora error'));

			const result = await fetchSwapAmountsEVM({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(result).toEqual([]);
		});
	});

	describe('fetchSwapAmountsSOL', () => {
		const sourceToken = mockValidSplToken;
		const destinationToken = {
			...mockValidErc20Token,
			network: ETHEREUM_NETWORK
		} as Erc20Token;

		const amount = 1_000_000n;
		const slippage = 1.5;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return [] when userAddress is nullish', async () => {
			const result = await fetchSwapAmountsSOL({
				sourceToken,
				destinationToken,
				amount,
				userAddress: undefined,
				slippage
			});

			expect(result).toEqual([]);
			expect(mockSolGetQuote).not.toHaveBeenCalled();
		});

		it('should return provider results and pass params correctly', async () => {
			const mockQuote = {
				provider: SwapProvider.NEAR_INTENTS as const,
				receiveAmount: 900_000n,
				receiveOutMinimum: 890_000n,
				swapDetails: {} as NearIntentsQuoteResponse
			};

			mockSolGetQuote.mockResolvedValue(mockQuote);

			const result = await fetchSwapAmountsSOL({
				sourceToken,
				destinationToken,
				amount,
				userAddress: mockSolAddress,
				slippage
			});

			expect(result).toEqual([mockQuote]);
			expect(mockSolGetQuote).toHaveBeenCalledWith(
				expect.objectContaining({
					sourceToken,
					destinationToken,
					amount,
					userAddress: mockSolAddress,
					slippage
				})
			);
		});

		it('should return [] when all providers return undefined', async () => {
			mockSolGetQuote.mockResolvedValue(undefined);

			const result = await fetchSwapAmountsSOL({
				sourceToken,
				destinationToken,
				amount,
				userAddress: mockSolAddress,
				slippage
			});

			expect(result).toEqual([]);
		});

		it('should skip providers whose quote rejects', async () => {
			mockSolGetQuote.mockRejectedValue(new Error('Provider error'));

			const result = await fetchSwapAmountsSOL({
				sourceToken,
				destinationToken,
				amount,
				userAddress: mockSolAddress,
				slippage
			});

			expect(result).toEqual([]);
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
			decimals: 6,
			enabled: true
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

		const mockSwapDetails: VeloraSwapDetails = {
			...mockVeloraSwapDetails
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

			vi.mocked(createPermit).mockResolvedValue({
				nonce: '0',
				deadline: 1234567890,
				encodedPermit: '0xpermitdata'
			});
		});

		it('should execute delta swap successfully when isGasless is false', async () => {
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
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
			expect(createPermit).not.toHaveBeenCalled();
		});

		it('throws for a native (default Ethereum) source token instead of approving a contract-less coin', async () => {
			const nativeSourceToken = {
				...mockSourceToken,
				standard: { code: 'ethereum' },
				category: 'default'
			} as unknown as Erc20Token;

			await expect(
				fetchVeloraDeltaSwap({
					identity: mockIdentity,
					progress: mockProgress,
					sourceToken: nativeSourceToken,
					destinationToken: mockDestinationToken,
					swapAmount: mockSwapAmount,
					sourceNetwork: mockSourceNetwork,
					receiveAmount: mockReceiveAmount,
					slippageValue: mockSlippageValue,
					destinationNetwork: mockDestinationNetwork,
					userAddress: mockUserAddress,
					gas: BigInt(mockGas),
					isGasless: false,
					maxFeePerGas: BigInt(mockMaxFeePerGas),
					maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
					swapDetails: mockSwapDetails
				})
			).rejects.toThrow('Velora Delta swaps do not support native source tokens.');

			expect(mockDeltaContractPostDeltaOrder).not.toHaveBeenCalled();
		});

		it('should execute delta swap successfully when isGasless is true', async () => {
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
				isGasless: true,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
			expect(createPermit).toHaveBeenCalled();
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
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
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
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
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
			decimals: 6,
			enabled: true
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
				isGasless: false,
				destinationNetwork: SEPOLIA_NETWORK
			});

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SWAP);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.UPDATE_UI);

			expect(mockSwapGetSpender).toHaveBeenCalled();
		});

		it('should execute market swap successfully with default Ethereum token', async () => {
			vi.mocked(ethUtils.isNotDefaultEthereumToken).mockReturnValue(false);

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
				isGasless: false,
				destinationNetwork: SEPOLIA_NETWORK
			});

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SWAP);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.UPDATE_UI);

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

			await loadKongSwapTokens({ identity: mockIdentity, allIcrcTokens: [mockIcrcCustomToken] });

			expect(get(kongSwapTokensStore)).toStrictEqual({
				[kongIcToken.symbol]: kongIcToken
			});
		});

		it('properly does not update store if no IC kongTokens available', async () => {
			vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue([{ ...mockKongBackendTokens[1] }]);

			await loadKongSwapTokens({ identity: mockIdentity, allIcrcTokens: [mockIcrcCustomToken] });

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
				balance1: ZERO
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
				balance0: ZERO,
				balance1: ZERO
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
				balance1: ZERO
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
				balance0: ZERO,
				balance1: ZERO
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
				balance0: ZERO,
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
				balance0: ZERO,
				balance1: ZERO
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
				balance1: ZERO
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
				balance0: ZERO,
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

	describe('trackEvent for swap-offer for evm tokens', () => {
		const sourceToken: Erc20Token = {
			...mockValidErc20Token,
			symbol: 'SRC',
			decimals: 18,
			network: { ...mockValidErc20Token.network, chainId: 1n },
			address: '0xSrcAddress',
			id: parseTokenId('1')
		};

		const destinationToken: Erc20Token = {
			...mockValidErc20Token,
			symbol: 'DST',
			decimals: 6,
			network: { ...mockValidErc20Token.network, chainId: 137n },
			address: '0xDestAddress',
			id: parseTokenId('2')
		};

		const amount = BigInt('1000000000000000000');
		const userAddress = '0xUser';
		const slippage = 1.5;

		const mockGetQuote = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(constructSimpleSDK).mockReturnValue({
				quote: { getQuote: mockGetQuote }
			} as unknown as ReturnType<typeof constructSimpleSDK>);

			exchangeStore.set([
				{ [sourceToken.address.toLowerCase()]: { usd: 1.5 } },
				{ [destinationToken.address.toLowerCase()]: { usd: 2.0 } }
			]);
		});

		afterEach(() => {
			mockGetQuote.mockReset();
			exchangeStore.reset();
		});

		it('returns undefined without calling the SDK when userAddress is nullish', async () => {
			const result = await fetchVeloraSwapAmount({
				sourceToken,
				destinationToken,
				amount,
				userAddress: null,
				slippage
			});

			expect(result).toBeUndefined();
			expect(constructSimpleSDK).not.toHaveBeenCalled();
		});

		it('returns undefined without calling the SDK when destination is not an EVM network', async () => {
			const result = await fetchVeloraSwapAmount({
				sourceToken,
				destinationToken: mockValidIcToken as unknown as Erc20Token,
				amount,
				userAddress,
				slippage
			});

			expect(result).toBeUndefined();
			expect(constructSimpleSDK).not.toHaveBeenCalled();
		});

		it('should track SWAP_OFFER with delta event type on successful delta quote', async () => {
			mockGetQuote.mockResolvedValue({
				delta: {
					destAmount: '123',
					bridge: { scalingFactor: 0 }
				}
			});

			await fetchVeloraSwapAmount({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_subcontext: SwapProvider.VELORA,
					result_status: 'success',
					event_type: 'delta',
					token_symbol: sourceToken.symbol,
					token2_symbol: destinationToken.symbol
				})
			});
		});

		it('should track SWAP_OFFER with market event type on successful market quote', async () => {
			mockGetQuote.mockResolvedValue({
				market: {
					destAmount: '456'
				}
			});

			await fetchVeloraSwapAmount({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_subcontext: SwapProvider.VELORA,
					result_status: 'success',
					event_type: 'market'
				})
			});
		});

		it('should track SWAP_OFFER with error on failed Velora quote', async () => {
			const error = new Error('Velora API Error');
			mockGetQuote.mockRejectedValue(error);

			await fetchVeloraSwapAmount({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_subcontext: SwapProvider.VELORA,
					result_status: 'error',
					result_error: error.message
				})
			});
		});

		it('should track bridge info in delta swap', async () => {
			mockGetQuote.mockResolvedValue({
				delta: {
					destAmount: '123',
					bridgeInfo: { destAmountAfterBridge: '949920' }
				}
			});

			await fetchVeloraSwapAmount({
				sourceToken,
				destinationToken,
				amount,
				userAddress,
				slippage
			});

			expect(trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: expect.objectContaining({
					event_type: 'delta',
					result_status: 'success'
				})
			});
		});

		describe('quote mode by source token type', () => {
			it('requests an "all"-mode quote for an ERC-20 source token', async () => {
				mockGetQuote.mockResolvedValue({ market: { destAmount: '456' } });

				await fetchVeloraSwapAmount({
					sourceToken,
					destinationToken,
					amount,
					userAddress,
					slippage
				});

				expect(mockGetQuote).toHaveBeenCalledWith(expect.objectContaining({ mode: 'all' }));
			});

			it('forces a "market"-mode quote for a native (default Ethereum) source token', async () => {
				// Velora Delta cannot pull native funds and we do not implement its native deposit
				// flow, so native sources must use the Market route to avoid the Delta approval crash.
				const nativeSourceToken = {
					...sourceToken,
					standard: { code: 'ethereum' },
					category: 'default'
				} as unknown as Erc20Token;

				mockGetQuote.mockResolvedValue({ market: { destAmount: '456' } });

				await fetchVeloraSwapAmount({
					sourceToken: nativeSourceToken,
					destinationToken,
					amount,
					userAddress,
					slippage
				});

				expect(mockGetQuote).toHaveBeenCalledWith(expect.objectContaining({ mode: 'market' }));
			});
		});
	});

	describe('trackEvent for swap_offer for icp tokens', () => {
		const mockTokens = [mockValidIcToken as IcToken, mockValidIcrcToken as IcToken];
		const [sourceToken, destinationToken] = mockTokens;
		const amount = 1000;
		const slippage = 0.5;

		beforeEach(() => {
			vi.clearAllMocks();
			exchangeStore.set([
				{ [sourceToken.id]: { usd: 1.5 } },
				{ [destinationToken.id]: { usd: 2.0 } }
			]);
		});

		afterEach(() => {
			exchangeStore.reset();
		});

		it('should track SWAP_OFFER event with success status for KONG_SWAP', async () => {
			const kongSwapResponse = {
				receive_amount: 950n,
				slippage: 0.5
			} as SwapAmountsReply;

			vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);

			await fetchSwapAmounts({
				identity: mockIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: mockTokens,
				slippage,
				isSourceTokenIcrc2: false,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_subcontext: SwapProvider.KONG_SWAP,
					result_status: 'success',
					token_symbol: sourceToken.symbol,
					token_network: sourceToken.network.name,
					token_address: sourceToken.ledgerCanisterId,
					token_name: sourceToken.name,
					token_id: String(sourceToken.id),
					token_standard: sourceToken.standard.code,
					token2_symbol: destinationToken.symbol,
					token2_network: destinationToken.network.name,
					token2_address: destinationToken.ledgerCanisterId,
					token2_name: destinationToken.name,
					token2_standard: destinationToken.standard.code,
					token2_id: String(destinationToken.id)
				})
			});
		});

		it('should track SWAP_OFFER event with error status for failed KONG_SWAP', async () => {
			const error = new Error('Kong Swap Error');
			vi.mocked(kongBackendApi.kongSwapAmounts).mockRejectedValue(error);

			await fetchSwapAmounts({
				identity: mockIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: mockTokens,
				slippage,
				isSourceTokenIcrc2: false,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_subcontext: SwapProvider.KONG_SWAP,
					result_status: 'error',
					result_error: error.message
				})
			});
		});

		it('should track SWAP_OFFER for ICP_SWAP when isSourceTokenIcrc2 is true', async () => {
			const icpSwapResponse = {
				receiveAmount: 975n,
				slippage: 0.5
			} as unknown as ICPSwapAmountReply;

			vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

			await fetchSwapAmounts({
				identity: mockIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: mockTokens,
				slippage,
				isSourceTokenIcrc2: true,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: expect.objectContaining({
						event_subcontext: SwapProvider.ICP_SWAP,
						result_status: 'success'
					})
				})
			);
		});

		it('should track SWAP_OFFER event with error status for failed ICP_SWAP', async () => {
			const error = new Error('ICP Swap Error');
			vi.mocked(icpSwapBackend.icpSwapAmounts).mockRejectedValue(error);

			await fetchSwapAmounts({
				identity: mockIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: mockTokens,
				slippage,
				isSourceTokenIcrc2: true,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: expect.objectContaining({
						event_subcontext: SwapProvider.ICP_SWAP,
						result_status: 'error',
						result_error: error.message
					})
				})
			);
		});

		it('should track both KONG_SWAP and ICP_SWAP events', async () => {
			const kongSwapResponse = {
				receive_amount: 950n,
				slippage: 0.5
			} as SwapAmountsReply;
			const icpSwapResponse = {
				receiveAmount: 975n,
				slippage: 0.5
			} as unknown as ICPSwapAmountReply;

			vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
			vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

			await fetchSwapAmounts({
				identity: mockIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: mockTokens,
				slippage,
				isSourceTokenIcrc2: true,
				userEthAddress: mockEthAddress,
				userSolAddress: undefined
			});

			expect(trackEvent).toHaveBeenCalledTimes(2);

			expect(trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: expect.objectContaining({
						event_subcontext: SwapProvider.KONG_SWAP,
						result_status: 'success'
					})
				})
			);
		});
	});

	describe('enableSwapDestinationToken via fetchNearIntentsEvmSwap', () => {
		const sourceToken = {
			...mockValidErc20Token,
			decimals: 6,
			address: '0xUSDC'
		};

		const mockProgress = vi.fn();

		const baseParams = {
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken,
			swapAmount: '1',
			receiveAmount: 900000n,
			slippageValue: '1',
			sourceNetwork: ETHEREUM_NETWORK,
			userAddress: mockEthAddress,
			gas: 21000n,
			maxFeePerGas: 20000000000n,
			maxPriorityFeePerGas: 2000000000n,
			swapDetails: mockNearIntentsQuoteResponse
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(sendEvm).mockResolvedValue({ hash: '0xTxHash123' });
			vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mockResolvedValue(undefined);
			vi.mocked(nearIntentsServices.pollNearIntentsStatus).mockResolvedValue(undefined);
		});

		it('should not call setCustomToken when ERC20 destination token is toggleable and already enabled', async () => {
			const destinationToken = {
				...mockValidErc20Token,
				decimals: 6,
				address: '0xARB_USDC',
				enabled: true
			};

			await fetchNearIntentsEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('should not call setCustomToken when ERC20 destination token is not toggleable', async () => {
			const destinationToken = {
				...mockValidErc20Token,
				decimals: 6,
				address: '0xARB_USDC'
			};

			await fetchNearIntentsEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('should call setCustomToken and loadCustomErc20Tokens when ERC20 destination token is toggleable and disabled', async () => {
			const destinationToken = {
				...mockValidErc20Token,
				decimals: 6,
				address: '0xARB_USDC',
				enabled: false
			};

			await fetchNearIntentsEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomErc20Tokens).toHaveBeenCalledOnce();
		});

		it('should silently catch errors from setCustomToken without breaking the swap flow', async () => {
			const destinationToken = {
				...mockValidErc20Token,
				decimals: 6,
				address: '0xARB_USDC',
				enabled: false
			};

			vi.mocked(setCustomToken).mockRejectedValueOnce(new Error('Backend error'));

			await expect(
				fetchNearIntentsEvmSwap({ ...baseParams, destinationToken })
			).resolves.not.toThrow();
		});

		it('should call setCustomToken and loadCustomErc20Tokens when ERC4626 destination token is toggleable and disabled', async () => {
			const destinationToken = {
				...mockValidErc4626Token,
				enabled: false
			};

			await fetchNearIntentsEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomErc20Tokens).toHaveBeenCalledOnce();
		});

		it('should not call setCustomToken when ERC4626 destination token is toggleable and already enabled', async () => {
			const destinationToken = {
				...mockValidErc4626Token,
				enabled: true
			};

			await fetchNearIntentsEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('should not call setCustomToken when ERC4626 destination token is not toggleable', async () => {
			await fetchNearIntentsEvmSwap({ ...baseParams, destinationToken: mockValidErc4626Token });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});
	});

	describe('enableSwapDestinationToken via fetchNearIntentsSolSwap', () => {
		const sourceToken = mockValidSplToken;
		const mockProgress = vi.fn();

		const baseParams = {
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken,
			swapAmount: '1',
			userAddress: mockSolAddress,
			swapDetails: mockNearIntentsQuoteResponse
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(sendSol).mockResolvedValue(mockSolSignature());
			vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mockResolvedValue(undefined);
			vi.mocked(nearIntentsServices.pollNearIntentsStatus).mockResolvedValue(undefined);
		});

		it('should not call setCustomToken when SPL destination token is toggleable and already enabled', async () => {
			const destinationToken = { ...mockValidSplToken, symbol: 'DEST', enabled: true };

			await fetchNearIntentsSolSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomSplTokens).not.toHaveBeenCalled();
		});

		it('should not call setCustomToken when SPL destination token is not toggleable', async () => {
			const destinationToken = { ...mockValidSplToken, symbol: 'DEST' };

			await fetchNearIntentsSolSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomSplTokens).not.toHaveBeenCalled();
		});

		it('should call setCustomToken and loadCustomSplTokens when SPL destination token is toggleable and disabled', async () => {
			const destinationToken = { ...mockValidSplToken, symbol: 'DEST', enabled: false };

			await fetchNearIntentsSolSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomSplTokens).toHaveBeenCalledOnce();
		});

		it('should call setCustomToken and loadCustomErc20Tokens when ERC4626 destination token is toggleable and disabled', async () => {
			const destinationToken = {
				...mockValidErc4626Token,
				enabled: false
			};

			await fetchNearIntentsSolSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomErc20Tokens).toHaveBeenCalledOnce();
			expect(loadCustomSplTokens).not.toHaveBeenCalled();
		});

		it('should not call setCustomToken when ERC4626 destination token is toggleable and already enabled', async () => {
			const destinationToken = {
				...mockValidErc4626Token,
				enabled: true
			};

			await fetchNearIntentsSolSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});
	});

	describe('fetchNearIntentsEvmSwap', () => {
		const sourceToken = {
			...mockValidErc20Token,
			decimals: 6,
			address: '0xUSDC'
		};

		const destinationToken = {
			...mockValidErc20Token,
			decimals: 6,
			address: '0xARB_USDC',
			enabled: true
		};

		const mockProgress = vi.fn();
		const { depositAddress } = mockNearIntentsQuoteResponse.quote;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(sendEvm).mockResolvedValue({ hash: '0xTxHash123' });
			vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mockResolvedValue(undefined);
			vi.mocked(nearIntentsServices.pollNearIntentsStatus).mockResolvedValue(undefined);
		});

		it('should execute the full NEAR Intents swap flow using swapDetails directly', async () => {
			await fetchNearIntentsEvmSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				receiveAmount: 900000n,
				slippageValue: '1',
				sourceNetwork: ETHEREUM_NETWORK,
				userAddress: mockEthAddress,
				gas: 21000n,
				maxFeePerGas: 20000000000n,
				maxPriorityFeePerGas: 2000000000n,
				swapDetails: mockNearIntentsQuoteResponse
			});

			expect(sendEvm).toHaveBeenCalledWith(
				expect.objectContaining({
					from: mockEthAddress,
					to: depositAddress
				})
			);
			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledWith({
				depositAddress,
				txHash: '0xTxHash123'
			});
			expect(nearIntentsServices.pollNearIntentsStatus).toHaveBeenCalledWith({
				depositAddress
			});
		});

		it('should report progress steps in correct order', async () => {
			await fetchNearIntentsEvmSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				receiveAmount: 900000n,
				slippageValue: '1',
				sourceNetwork: ETHEREUM_NETWORK,
				userAddress: mockEthAddress,
				gas: 21000n,
				maxFeePerGas: 20000000000n,
				maxPriorityFeePerGas: 2000000000n,
				swapDetails: mockNearIntentsQuoteResponse
			});

			expect(mockProgress).toHaveBeenCalledTimes(3);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SIGN_TRANSFER);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.SWAP);
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsSwap.UPDATE_UI);
		});

		it('should pass depositMemo when present in quote', async () => {
			const quoteWithMemo = {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, depositMemo: 'stellar-memo' }
			};

			await fetchNearIntentsEvmSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				receiveAmount: 900000n,
				slippageValue: '1',
				sourceNetwork: ETHEREUM_NETWORK,
				userAddress: mockEthAddress,
				gas: 21000n,
				maxFeePerGas: 20000000000n,
				maxPriorityFeePerGas: 2000000000n,
				swapDetails: quoteWithMemo
			});

			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledWith({
				depositAddress,
				txHash: '0xTxHash123',
				depositMemo: 'stellar-memo'
			});
			expect(nearIntentsServices.pollNearIntentsStatus).toHaveBeenCalledWith({
				depositAddress,
				depositMemo: 'stellar-memo'
			});
		});
	});

	describe('fetchNearIntentsSolSwap', () => {
		const sourceToken = mockValidSplToken;
		const destinationToken = { ...mockValidSplToken, symbol: 'DEST', enabled: true };
		const mockProgress = vi.fn();
		const solTxSignature = mockSolSignature();
		const { depositAddress } = mockNearIntentsQuoteResponse.quote;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(sendSol).mockResolvedValue(solTxSignature);
			vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mockResolvedValue(undefined);
			vi.mocked(nearIntentsServices.pollNearIntentsStatus).mockResolvedValue(undefined);
		});

		it('should execute the full Solana swap flow', async () => {
			await fetchNearIntentsSolSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				userAddress: mockSolAddress,
				swapDetails: mockNearIntentsQuoteResponse
			});

			expect(sendSol).toHaveBeenCalledWith(
				expect.objectContaining({
					token: sourceToken,
					destination: depositAddress,
					source: mockSolAddress,
					prioritizationFee: ZERO
				})
			);
			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledWith({
				depositAddress,
				txHash: solTxSignature
			});
			expect(nearIntentsServices.pollNearIntentsStatus).toHaveBeenCalledWith({
				depositAddress
			});
		});

		it('should report progress steps in correct order', async () => {
			await fetchNearIntentsSolSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				userAddress: mockSolAddress,
				swapDetails: mockNearIntentsQuoteResponse
			});

			expect(mockProgress).toHaveBeenCalledTimes(3);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SIGN_TRANSFER);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.SWAP);
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsSwap.UPDATE_UI);
		});

		it('should pass depositMemo when present in quote', async () => {
			const quoteWithMemo = {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, depositMemo: 'sol-memo-123' }
			};

			await fetchNearIntentsSolSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				userAddress: mockSolAddress,
				swapDetails: quoteWithMemo
			});

			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledWith({
				depositAddress,
				txHash: solTxSignature,
				depositMemo: 'sol-memo-123'
			});
			expect(nearIntentsServices.pollNearIntentsStatus).toHaveBeenCalledWith({
				depositAddress,
				depositMemo: 'sol-memo-123'
			});
		});
	});

	describe('fetchOneSecIcpToEvmSwap', () => {
		const sourceToken = mockValidIcToken as IcToken;
		const mockProgress = vi.fn();

		const baseParams = {
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken,
			swapAmount: '1',
			userEthAddress: mockEthAddress,
			swapId: 'test-icp-to-evm-swap-id'
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(oneSecSwapServices.executeOneSecIcpToEvmBridge).mockResolvedValue();
		});

		it('should call executeOneSecIcpToEvmBridge with the provided params', async () => {
			const destinationToken = { ...mockValidErc20Token, enabled: true } as Erc20Token;

			await fetchOneSecIcpToEvmSwap({ ...baseParams, destinationToken });

			expect(oneSecSwapServices.executeOneSecIcpToEvmBridge).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					sourceToken,
					destinationToken,
					swapAmount: '1',
					userEthAddress: mockEthAddress
				})
			);
		});

		it('enables a disabled ERC20 destination token at submit time', async () => {
			const destinationToken = { ...mockValidErc20Token, enabled: false } as Erc20Token;

			await fetchOneSecIcpToEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomErc20Tokens).toHaveBeenCalledOnce();
		});

		it('skips enabling an already-enabled ERC20 destination token', async () => {
			const destinationToken = { ...mockValidErc20Token, enabled: true } as Erc20Token;

			await fetchOneSecIcpToEvmSwap({ ...baseParams, destinationToken });

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('does not enable the destination token when the bridge foreground rejects', async () => {
			// Enable now runs AFTER the bridge resolves — a foreground failure
			// (user cancelled, fee check rejected, etc.) means no funds moved
			// and no AUT row exists, so we don't enable a token the user never
			// actually committed to.
			const destinationToken = { ...mockValidErc20Token, enabled: false } as Erc20Token;
			vi.mocked(oneSecSwapServices.executeOneSecIcpToEvmBridge).mockRejectedValue(
				new Error('Bridge failed')
			);

			await expect(fetchOneSecIcpToEvmSwap({ ...baseParams, destinationToken })).rejects.toThrow(
				'Bridge failed'
			);

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('should propagate errors thrown by executeOneSecIcpToEvmBridge', async () => {
			const destinationToken = { ...mockValidErc20Token, enabled: true } as Erc20Token;
			vi.mocked(oneSecSwapServices.executeOneSecIcpToEvmBridge).mockRejectedValue(
				new Error('Bridge failed')
			);

			await expect(fetchOneSecIcpToEvmSwap({ ...baseParams, destinationToken })).rejects.toThrow(
				'Bridge failed'
			);
		});
	});

	describe('fetchOneSecEvmToIcpSwap', () => {
		const sourceToken = { ...mockValidErc20Token, network: ETHEREUM_NETWORK } as Erc20Token;
		const destinationToken = mockValidIcToken as IcToken;
		const mockProgress = vi.fn();

		const baseParams = {
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken,
			destinationToken,
			swapAmount: '1',
			userEthAddress: mockEthAddress,
			gas: 21000n,
			maxFeePerGas: 20000000000n,
			maxPriorityFeePerGas: 2000000000n,
			swapId: 'test-evm-to-icp-swap-id'
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(oneSecSwapServices.executeOneSecEvmToIcpBridge).mockResolvedValue();
		});

		it('should call executeOneSecEvmToIcpBridge with the provided params', async () => {
			await fetchOneSecEvmToIcpSwap(baseParams);

			expect(oneSecSwapServices.executeOneSecEvmToIcpBridge).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					sourceToken,
					destinationToken,
					swapAmount: '1',
					userEthAddress: mockEthAddress
				})
			);
		});

		it('should not call setCustomToken for an ICP destination token', async () => {
			await fetchOneSecEvmToIcpSwap(baseParams);

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('should propagate errors thrown by executeOneSecEvmToIcpBridge', async () => {
			vi.mocked(oneSecSwapServices.executeOneSecEvmToIcpBridge).mockRejectedValue(
				new Error('EVM bridge failed')
			);

			await expect(fetchOneSecEvmToIcpSwap(baseParams)).rejects.toThrow('EVM bridge failed');
		});
	});
});
