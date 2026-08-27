import { sendBtc } from '$btc/services/btc-send.services';
import type { PoolMetadata } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { createPermit } from '$eth/services/eip2612-permit.services';
import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { send as sendEvm } from '$eth/services/send.services';
import { swap as sendEvmSwap } from '$eth/services/swap.services';
import type { Erc20Token } from '$eth/types/erc20';
import * as ethUtils from '$eth/utils/eth.utils';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { loadCustomTokens as loadCustomIcrcTokens } from '$icp/services/icrc.services';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { setCustomToken } from '$lib/api/backend.api';
import * as icpSwapPool from '$lib/api/icp-swap-pool.api';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import { signPrehash } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import { PLAUSIBLE_EVENTS, PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { trackEvent } from '$lib/services/analytics.services';
import * as icpSwapBackend from '$lib/services/icp-swap.services';
import * as nearIntentsServices from '$lib/services/near-intents.services';
import * as oneSecSwapServices from '$lib/services/onesec-swap.services';
import {
	enableSwapDestinationToken,
	fetchNearIntentsBtcSwap,
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
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsQuoteResponse
} from '$lib/types/near-intents';
import { SwapErrorCodes, SwapProvider } from '$lib/types/swap';
import { VELORA_EXTERNAL_REF_KEYS } from '$lib/types/velora-swap';
import { verifyNearIntentsQuoteSignature } from '$lib/utils/near-intents-quote.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { sendSol } from '$sol/services/sol-send.services';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockValidIcCkToken,
	mockValidIcToken,
	mockValidIcrcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import {
	mockVeloraCrossChainSwapResponse,
	mockVeloraDeltaPrice,
	mockVeloraOptimalRate
} from '$tests/mocks/velora.mock';
import { constructSimpleSDK, type DeltaPrice, type OptimalRate } from '@velora-dex/sdk';
import { get, readable } from 'svelte/store';

vi.mock('$icp/services/icrc.services', async (importOriginal) => ({
	...(await importOriginal<object>()),
	loadCustomTokens: vi.fn()
}));

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
const mockBtcGetQuote = vi.hoisted(() => vi.fn());

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

vi.mock('$lib/providers/btc-swap.providers', () => ({
	btcSwapProviders: [
		{
			key: 'chainFusion',
			getQuote: mockBtcGetQuote,
			isEnabled: true
		}
	]
}));

vi.mock('$lib/services/onesec-swap.services', () => ({
	executeOneSecEvmToIcpBridge: vi.fn(),
	executeOneSecIcpToEvmBridge: vi.fn()
}));

// Quote fixtures carry no genuine 1Click signature; the real verifier is exercised against
// a captured response in near-intents-quote.utils.spec.ts. The default implementation lives
// in the factory so the suite's many `clearAllMocks` calls do not strip it.
vi.mock('$lib/utils/near-intents-quote.utils', () => ({
	verifyNearIntentsQuoteSignature: vi.fn().mockResolvedValue(true)
}));

vi.mock('$lib/services/near-intents.services', () => ({
	fetchNearIntentsSwapQuote: vi.fn(),
	submitNearIntentsDepositTx: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn()
}));

vi.mock('$eth/services/send.services', () => ({
	send: vi.fn()
}));

vi.mock('$sol/services/sol-send.services', () => ({
	sendSol: vi.fn()
}));

vi.mock('$btc/services/btc-send.services', () => ({
	sendBtc: vi.fn()
}));

// `OrderHelpers` stays real: its status predicates are pure, and re-implementing them here would
// let the test disagree with the SDK about which statuses are terminal failures.
vi.mock('@velora-dex/sdk', async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...(actual as Record<string, unknown>),
		constructSimpleSDK: vi.fn()
	};
});

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
	// Re-applied per test: nested suites call `vi.resetAllMocks`, which strips the default
	// set in the module factory for every test that runs after them.
	beforeEach(() => {
		vi.mocked(verifyNearIntentsQuoteSignature).mockResolvedValue(true);
	});

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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
					userSolAddress: undefined,
					userBtcAddress: undefined
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
					userSolAddress: undefined,
					userBtcAddress: undefined
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
					userSolAddress: undefined,
					userBtcAddress: undefined
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
					userSolAddress: undefined,
					userBtcAddress: undefined
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
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
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
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
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
					userSolAddress: undefined,
					userBtcAddress: undefined
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
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
				});

				expect(mockSolGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockEthAddress
					})
				);
			});

			// Regression: the two live cross-chain directions keep the recipient they had
			// before the recipient resolution was shared across the fan-out branches.
			it('should keep passing the Solana address as recipient when the destination is Solana', async () => {
				mockSolGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmDestToken,
					destinationToken: solSourceToken,
					amount: 100,
					tokens: [evmDestToken, solSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
				});

				expect(mockSolGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockEthAddress,
						recipientAddress: mockSolAddress
					})
				);
			});

			it('should keep passing the EVM address as recipient when the destination is EVM', async () => {
				mockSolGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: solSourceToken,
					destinationToken: evmDestToken,
					amount: 100,
					tokens: [solSourceToken, evmDestToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
				});

				expect(mockSolGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockSolAddress,
						recipientAddress: mockEthAddress
					})
				);
			});

			it('should pass the user Bitcoin address as recipient when the destination is BTC mainnet', async () => {
				mockSolGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: solSourceToken,
					destinationToken: BTC_MAINNET_TOKEN,
					amount: 100,
					tokens: [solSourceToken, BTC_MAINNET_TOKEN],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: mockBtcAddress
				});

				expect(mockSolGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockSolAddress,
						recipientAddress: mockBtcAddress
					})
				);
			});

			// A missing destination-chain address must suppress the quote entirely: quoting
			// anyway would let the request fall back to the source-chain address as the
			// payout destination.
			it('should not quote a Solana destination when the user Solana address is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmDestToken,
					destinationToken: solSourceToken,
					amount: 100,
					tokens: [evmDestToken, solSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: undefined
				});

				expect(result).toEqual([]);
				expect(mockSolGetQuote).not.toHaveBeenCalled();
			});

			it('should not quote an EVM destination when the user EVM address is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: solSourceToken,
					destinationToken: evmDestToken,
					amount: 100,
					tokens: [solSourceToken, evmDestToken],
					slippage: 1,
					userEthAddress: undefined,
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
				});

				expect(result).toEqual([]);
				expect(mockSolGetQuote).not.toHaveBeenCalled();
			});

			it('should not quote a BTC destination when the user Bitcoin address is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: solSourceToken,
					destinationToken: BTC_MAINNET_TOKEN,
					amount: 100,
					tokens: [solSourceToken, BTC_MAINNET_TOKEN],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: undefined
				});

				expect(result).toEqual([]);
				expect(mockSolGetQuote).not.toHaveBeenCalled();
			});
		});

		describe('with Bitcoin tokens', () => {
			const btcSourceToken = BTC_MAINNET_TOKEN;

			beforeEach(() => {
				vi.clearAllMocks();
			});

			// Without its own branch a Bitcoin source falls through to the EVM fan-out and is
			// cast to `Erc20Token`, which no EVM provider can quote.
			it('should route a Bitcoin source to the BTC fan-out', async () => {
				mockBtcGetQuote.mockResolvedValue({
					provider: SwapProvider.CHAIN_FUSION,
					receiveAmount: 500n,
					swapDetails: { sourceFees: [], externalFees: [] }
				});

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: btcSourceToken,
					destinationToken: mockValidIcCkToken as IcToken,
					amount: 1,
					tokens: [btcSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: mockBtcAddress
				});

				expect(result).toHaveLength(1);
				expect(result[0].provider).toBe(SwapProvider.CHAIN_FUSION);
				expect(mockVeloraGetQuote).not.toHaveBeenCalled();
				expect(mockBtcGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({ userBtcAddress: mockBtcAddress })
				);
			});

			it('should return [] when the user Bitcoin address is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: btcSourceToken,
					destinationToken: mockValidIcCkToken as IcToken,
					amount: 1,
					tokens: [btcSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: undefined
				});

				expect(result).toEqual([]);
				expect(mockBtcGetQuote).not.toHaveBeenCalled();
			});

			// A ckBTC source is an ICP source: it keeps taking the ICP-bridge fan-out.
			it('should route a Bitcoin destination through the ICP bridge fan-out', async () => {
				mockIcpBridgeGetQuote.mockResolvedValue({
					provider: SwapProvider.CHAIN_FUSION,
					receiveAmount: 500n,
					swapDetails: { sourceFees: [], externalFees: [] }
				});

				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: mockValidIcCkToken as IcToken,
					destinationToken: btcSourceToken,
					amount: 1,
					tokens: [btcSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: mockBtcAddress
				});

				expect(result).toHaveLength(1);
				expect(mockIcpBridgeGetQuote).toHaveBeenCalledOnce();
				expect(mockBtcGetQuote).not.toHaveBeenCalled();
			});

			it('should pass the EVM address as recipient for an EVM destination', async () => {
				mockBtcGetQuote.mockResolvedValue(undefined);

				const evmDest = { ...mockValidErc20Token, network: ETHEREUM_NETWORK } as Erc20Token;

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: btcSourceToken,
					destinationToken: evmDest,
					amount: 1,
					tokens: [btcSourceToken, evmDest],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: mockBtcAddress
				});

				expect(mockBtcGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userBtcAddress: mockBtcAddress,
						recipientAddress: mockEthAddress
					})
				);
			});

			it('should pass the Solana address as recipient for a Solana destination', async () => {
				mockBtcGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: btcSourceToken,
					destinationToken: mockValidSplToken,
					amount: 1,
					tokens: [btcSourceToken, mockValidSplToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: mockBtcAddress
				});

				expect(mockBtcGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userBtcAddress: mockBtcAddress,
						recipientAddress: mockSolAddress
					})
				);
				expect(mockSolGetQuote).not.toHaveBeenCalled();
			});

			it('should not quote a Solana destination when the user Solana address is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: btcSourceToken,
					destinationToken: mockValidSplToken,
					amount: 1,
					tokens: [btcSourceToken, mockValidSplToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: mockBtcAddress
				});

				expect(result).toEqual([]);
				expect(mockBtcGetQuote).not.toHaveBeenCalled();
			});

			// Regression: BTC → ckBTC, today's only live BTC-source pair, keeps the exact
			// quote payload it had before the recipient threading.
			it('should quote an ICP destination without a recipient address', async () => {
				mockBtcGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: btcSourceToken,
					destinationToken: mockValidIcCkToken as IcToken,
					amount: 1,
					tokens: [btcSourceToken],
					slippage: 1,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: mockBtcAddress
				});

				expect(mockBtcGetQuote).toHaveBeenCalledWith({
					sourceToken: btcSourceToken,
					destinationToken: mockValidIcCkToken,
					amount: 100_000_000n,
					userBtcAddress: mockBtcAddress,
					recipientAddress: undefined,
					slippage: 1
				});
			});
		});

		describe('with an EVM source and a non-EVM, non-Solana destination', () => {
			const evmSourceToken = { ...mockValidErc20Token, network: ETHEREUM_NETWORK } as Erc20Token;

			beforeEach(() => {
				vi.clearAllMocks();
			});

			it('should pass the user Bitcoin address as recipient when the destination is BTC mainnet', async () => {
				mockVeloraGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmSourceToken,
					destinationToken: BTC_MAINNET_TOKEN,
					amount: 1000,
					tokens: [evmSourceToken, BTC_MAINNET_TOKEN],
					slippage: 0.5,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: mockBtcAddress
				});

				expect(mockVeloraGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockEthAddress,
						recipientAddress: mockBtcAddress
					})
				);
				expect(mockBtcGetQuote).not.toHaveBeenCalled();
			});

			// The user's BTC payout address is not available yet: quoting anyway would let
			// the request fall back to the EVM source address as the BTC recipient.
			it('should not quote a BTC destination when the user Bitcoin address is nullish', async () => {
				const result = await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmSourceToken,
					destinationToken: BTC_MAINNET_TOKEN,
					amount: 1000,
					tokens: [evmSourceToken, BTC_MAINNET_TOKEN],
					slippage: 0.5,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: undefined
				});

				expect(result).toEqual([]);
				expect(mockVeloraGetQuote).not.toHaveBeenCalled();
			});

			// Regression: an EVM → EVM quote's recipient resolves to the user's own EVM
			// address, the value the quote request builder already fell back to when no
			// recipient was passed, so the request payload is unchanged.
			it('should mirror the user EVM address as recipient for an EVM destination', async () => {
				mockVeloraGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmSourceToken,
					destinationToken: mockValidErc20Token,
					amount: 1000,
					tokens: [evmSourceToken, mockValidErc20Token],
					slippage: 0.5,
					userEthAddress: mockEthAddress,
					userSolAddress: undefined,
					userBtcAddress: undefined
				});

				expect(mockVeloraGetQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						userAddress: mockEthAddress,
						recipientAddress: mockEthAddress
					})
				);
			});

			// Regression: an ICP destination has no cross-chain payout address, so the quote
			// payload stays exactly what it was before the recipient threading.
			it('should not pass a recipient for an ICP destination', async () => {
				mockVeloraGetQuote.mockResolvedValue(undefined);

				await fetchSwapAmounts({
					identity: mockIdentity,
					sourceToken: evmSourceToken,
					destinationToken: mockValidIcrcToken as IcToken,
					amount: 1000,
					tokens: [evmSourceToken, mockValidIcrcToken as IcToken],
					slippage: 0.5,
					userEthAddress: mockEthAddress,
					userSolAddress: mockSolAddress,
					userBtcAddress: mockBtcAddress
				});

				expect(mockVeloraGetQuote).toHaveBeenCalledWith({
					sourceToken: evmSourceToken,
					destinationToken: mockValidIcrcToken,
					amount: expect.any(BigInt),
					userAddress: mockEthAddress,
					recipientAddress: undefined,
					slippage: 0.5
				});
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
		const mockUserAddress = mockEthAddress;
		const mockGas = '21000';
		const mockMaxFeePerGas = '20000000000';
		const mockMaxPriorityFeePerGas = '2000000000';

		const mockSwapDetails: DeltaPrice = {
			...mockVeloraDeltaPrice
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
			// destAmount mirrors what the server would build from the mock quote's origin output
			// (900000000) at the default 0.5% slippage.
			mockDeltaContractBuildDeltaOrder.mockResolvedValue({
				toSign: { domain: {}, types: {}, value: { destAmount: '895500000' } },
				orderHash: 'mock-order-hash'
			});
			mockDeltaContractPostDeltaOrder.mockResolvedValue({ id: 'mock-auction-id' });

			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();

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
				userAddress: mockUserAddress,
				gas: BigInt(mockGas),
				isGasless: true,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
			expect(createPermit).toHaveBeenCalled();

			// The permit rides along, but the order nonce must stay unset: the server randomizes
			// it, and the per-token permit counter would collide per address on /v2/delta/orders.
			const [[buildParams]] = mockDeltaContractBuildDeltaOrder.mock.calls;

			expect(buildParams).toMatchObject({
				deadline: 1234567890,
				permit: '0xpermitdata'
			});
			expect(buildParams).not.toHaveProperty('nonce');
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

		it('registers an active user transaction and leaves settlement to the poller', async () => {
			await fetchVeloraDeltaSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken: mockSourceToken,
				destinationToken: mockDestinationToken,
				swapAmount: mockSwapAmount,
				sourceNetwork: mockSourceNetwork,
				receiveAmount: mockReceiveAmount,
				slippageValue: mockSlippageValue,
				userAddress: mockUserAddress,
				gas: BigInt(mockGas),
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			expect(
				activeUserTransactionsServices.createActiveUserTransaction
			).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: {
						Velora: expect.objectContaining({
							mode: { Delta: null },
							// The row stores base units: the 18-decimal source token scales the amount.
							amount: BigInt(mockSwapAmount) * 10n ** 18n
						})
					},
					externalRefs: expect.arrayContaining([
						{ key: VELORA_EXTERNAL_REF_KEYS.AUCTION_ID, value: 'mock-auction-id' },
						{ key: VELORA_EXTERNAL_REF_KEYS.ORDER_HASH, value: 'mock-order-hash' },
						{
							key: VELORA_EXTERNAL_REF_KEYS.CHAIN_ID,
							value: `${mockSourceNetwork.chainId}`
						}
					])
				})
			);

			// Settlement is the global AUT poller's job now — the modal must not block on it.
			expect(mockDeltaContractGetDeltaOrderById).not.toHaveBeenCalled();
			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
		});

		it('snapshots the USD value of the source amount at commit time', async () => {
			// The row's terminal analytics must report the value the user swapped at,
			// not the rate whenever the swap happens to settle.
			vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
				readable({ [mockSourceToken.id]: { usd: 2 } })
			);

			await fetchVeloraDeltaSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken: mockSourceToken,
				destinationToken: mockDestinationToken,
				swapAmount: mockSwapAmount,
				sourceNetwork: mockSourceNetwork,
				receiveAmount: mockReceiveAmount,
				slippageValue: mockSlippageValue,
				userAddress: mockUserAddress,
				gas: BigInt(mockGas),
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			expect(
				activeUserTransactionsServices.createActiveUserTransaction
			).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					externalRefs: expect.arrayContaining([
						{
							key: VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE,
							value: `${Number(mockSwapAmount) * 2}`
						}
					])
				})
			);
		});

		it('omits the USD value when the source token has no exchange rate', async () => {
			vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(readable({}));

			await fetchVeloraDeltaSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken: mockSourceToken,
				destinationToken: mockDestinationToken,
				swapAmount: mockSwapAmount,
				sourceNetwork: mockSourceNetwork,
				receiveAmount: mockReceiveAmount,
				slippageValue: mockSlippageValue,
				userAddress: mockUserAddress,
				gas: BigInt(mockGas),
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			const [[{ externalRefs }]] = vi.mocked(
				activeUserTransactionsServices.createActiveUserTransaction
			).mock.calls;

			expect(externalRefs).not.toContainEqual(
				expect.objectContaining({ key: VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE })
			);
		});

		it('does not fail the swap when registering the active user transaction fails', async () => {
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockRejectedValueOnce(
				new Error('backend down')
			);

			await expect(
				fetchVeloraDeltaSwap({
					identity: mockIdentity,
					progress: mockProgress,
					sourceToken: mockSourceToken,
					destinationToken: mockDestinationToken,
					swapAmount: mockSwapAmount,
					sourceNetwork: mockSourceNetwork,
					receiveAmount: mockReceiveAmount,
					slippageValue: mockSlippageValue,
					userAddress: mockUserAddress,
					gas: BigInt(mockGas),
					isGasless: false,
					maxFeePerGas: BigInt(mockMaxFeePerGas),
					maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
					swapDetails: mockSwapDetails
				})
			).resolves.toBeUndefined();

			expect(mockProgress).toHaveBeenLastCalledWith(ProgressStepsSwap.UPDATE_UI);
		});

		it('rounds the slippage to integer basis points when building the order', async () => {
			// 29 bps on the mock quote's origin output (900000000) → minimum 897390000.
			mockDeltaContractBuildDeltaOrder.mockResolvedValue({
				toSign: { domain: {}, types: {}, value: { destAmount: '897390000' } },
				orderHash: 'mock-order-hash'
			});

			await fetchVeloraDeltaSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken: mockSourceToken,
				destinationToken: mockDestinationToken,
				swapAmount: mockSwapAmount,
				sourceNetwork: mockSourceNetwork,
				receiveAmount: mockReceiveAmount,
				// 0.29 * 100 === 28.999999999999996 in IEEE-754 — must reach the SDK as 29
				slippageValue: '0.29',
				userAddress: mockUserAddress,
				gas: BigInt(mockGas),
				isGasless: false,
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails
			});

			expect(mockDeltaContractBuildDeltaOrder).toHaveBeenCalledWith(
				expect.objectContaining({ slippage: 29 })
			);
		});

		it('refuses to sign an order whose destAmount is below the slippage minimum', async () => {
			// The server-built minimum guarantees less than the quoted origin output (900000000)
			// minus the 0.5% slippage the user accepted (895500000).
			mockDeltaContractBuildDeltaOrder.mockResolvedValue({
				toSign: { domain: {}, types: {}, value: { destAmount: '895499999' } },
				orderHash: 'mock-order-hash'
			});

			await expect(
				fetchVeloraDeltaSwap({
					identity: mockIdentity,
					progress: mockProgress,
					sourceToken: mockSourceToken,
					destinationToken: mockDestinationToken,
					swapAmount: mockSwapAmount,
					sourceNetwork: mockSourceNetwork,
					receiveAmount: mockReceiveAmount,
					slippageValue: mockSlippageValue,
					userAddress: mockUserAddress,
					gas: BigInt(mockGas),
					isGasless: false,
					maxFeePerGas: BigInt(mockMaxFeePerGas),
					maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
					swapDetails: mockSwapDetails
				})
			).rejects.toThrow(
				// The `Slippage exceeded.` prefix is what the wizards match to show the slippage hint.
				'Slippage exceeded. Velora returned 895499999, expected at least 895500000.'
			);

			expect(signPrehash).not.toHaveBeenCalled();
			expect(mockDeltaContractPostDeltaOrder).not.toHaveBeenCalled();
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

		const mockSwapDetails: OptimalRate = {
			...mockVeloraOptimalRate
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

		const mockTxHash = '0xMarketTxHash';
		const mockTxNonce = 7;

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
			vi.mocked(sendEvmSwap).mockResolvedValue({ hash: mockTxHash, nonce: mockTxNonce });
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();
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
				swapDetails: mockSwapDetails,
				receiveAmount: BigInt(1000),
				isGasless: false
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
				swapDetails: mockSwapDetails,
				receiveAmount: BigInt(1000),
				isGasless: false
			});

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SWAP);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.UPDATE_UI);

			expect(mockSwapGetSpender).toHaveBeenCalled();
			expect(mockSwapBuildTx).toHaveBeenCalled();
		});

		it('rounds the slippage to integer basis points when building the transaction', async () => {
			await fetchVeloraMarketSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken: mockSourceToken,
				destinationToken: mockDestinationToken,
				swapAmount: mockSwapAmount,
				sourceNetwork: mockSourceNetwork,
				// 0.29 * 100 === 28.999999999999996 in IEEE-754 — must reach the SDK as 29
				slippageValue: '0.29',
				userAddress: mockUserAddress,
				gas: BigInt(mockGas),
				maxFeePerGas: BigInt(mockMaxFeePerGas),
				maxPriorityFeePerGas: BigInt(mockMaxPriorityFeePerGas),
				swapDetails: mockSwapDetails,
				receiveAmount: BigInt(1000),
				isGasless: false
			});

			expect(mockSwapBuildTx).toHaveBeenCalledWith(expect.objectContaining({ slippage: 29 }));
		});

		it('registers an active user transaction carrying the tx hash, nonce and chain id', async () => {
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
				swapDetails: mockSwapDetails,
				receiveAmount: BigInt(1000),
				isGasless: false
			});

			expect(
				activeUserTransactionsServices.createActiveUserTransaction
			).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: {
						Velora: expect.objectContaining({
							mode: { Market: null },
							// The row stores base units: the 18-decimal source token scales the amount.
							amount: BigInt(mockSwapAmount) * 10n ** 18n
						})
					},
					externalRefs: expect.arrayContaining([
						{ key: VELORA_EXTERNAL_REF_KEYS.TX_HASH, value: mockTxHash },
						{ key: VELORA_EXTERNAL_REF_KEYS.TX_NONCE, value: `${mockTxNonce}` },
						{
							key: VELORA_EXTERNAL_REF_KEYS.CHAIN_ID,
							value: `${mockSourceNetwork.chainId}`
						}
					])
				})
			);
		});

		it('does not fail the swap when registering the active user transaction fails', async () => {
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockRejectedValueOnce(
				new Error('backend down')
			);

			await expect(
				fetchVeloraMarketSwap({
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
					swapDetails: mockSwapDetails,
					receiveAmount: BigInt(1000),
					isGasless: false
				})
			).resolves.toBeUndefined();

			expect(mockProgress).toHaveBeenLastCalledWith(ProgressStepsSwap.UPDATE_UI);
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
			mockGetQuote.mockResolvedValue({ delta: mockVeloraDeltaPrice });

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

		it('should track a cross-chain delta swap', async () => {
			mockGetQuote.mockResolvedValue(mockVeloraCrossChainSwapResponse);

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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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
				userSolAddress: undefined,
				userBtcAddress: undefined
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

	describe('enableSwapDestinationToken with an ICRC destination', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		// The regression this guards: a Chain Fusion mint (and a 1Sec bridge) lands on an
		// ICRC ck token, which the ERC and SPL branches cannot persist — the swap completed
		// with the destination still hidden and its new balance invisible.
		it('persists a disabled ICRC destination and reloads the custom tokens', async () => {
			await enableSwapDestinationToken({
				identity: mockIdentity,
				destinationToken: {
					...mockValidIcCkToken,
					standard: { code: 'icrc' },
					enabled: false
				} as IcTokenToggleable
			});

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomIcrcTokens).toHaveBeenCalledOnce();
		});

		it('does nothing when the ICRC destination is already enabled', async () => {
			await enableSwapDestinationToken({
				identity: mockIdentity,
				destinationToken: {
					...mockValidIcCkToken,
					standard: { code: 'icrc' },
					enabled: true
				} as IcTokenToggleable
			});

			expect(setCustomToken).not.toHaveBeenCalled();
			expect(loadCustomIcrcTokens).not.toHaveBeenCalled();
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
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();
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
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();
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
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();
		});

		it('should not send funds when the quote signature does not verify', async () => {
			vi.mocked(verifyNearIntentsQuoteSignature).mockResolvedValue(false);

			await expect(
				fetchNearIntentsEvmSwap({
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
				})
			).rejects.toMatchObject({ code: SwapErrorCodes.NEAR_INTENTS_QUOTE_UNVERIFIED });

			expect(sendEvm).not.toHaveBeenCalled();
			expect(nearIntentsServices.submitNearIntentsDepositTx).not.toHaveBeenCalled();
			expect(activeUserTransactionsServices.createActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('should retain the quote signature on the AUT row', async () => {
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

			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					externalRefs: expect.arrayContaining([
						{
							key: NEAR_INTENTS_EXTERNAL_REF_KEYS.SIGNATURE,
							value: mockNearIntentsQuoteResponse.signature
						}
					])
				})
			);
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
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: { NearIntents: expect.objectContaining({ amount: 1000000n }) },
					externalRefs: expect.arrayContaining([
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: depositAddress }
					])
				})
			);
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

		// Regression for the BTC broadcast-time hook: a reversible transport keeps the
		// original ordering, creating the AUT row only once, after the send has resolved
		// and the deposit been submitted.
		it('should create the AUT row after the send resolves and the deposit is submitted', async () => {
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

			const [sendOrder] = vi.mocked(sendEvm).mock.invocationCallOrder;
			const [submitOrder] = vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mock
				.invocationCallOrder;
			const [createOrder] = vi.mocked(activeUserTransactionsServices.createActiveUserTransaction)
				.mock.invocationCallOrder;

			expect(sendOrder).toBeLessThan(submitOrder);
			expect(submitOrder).toBeLessThan(createOrder);
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledOnce();
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
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					externalRefs: expect.arrayContaining([
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: depositAddress },
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO, value: 'stellar-memo' }
					])
				})
			);
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
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();
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
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: expect.objectContaining({ NearIntents: expect.anything() }),
					externalRefs: expect.arrayContaining([
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: depositAddress }
					])
				})
			);
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

		// Regression for the BTC broadcast-time hook: a reversible transport keeps the
		// original ordering, creating the AUT row only once, after the send has resolved
		// and the deposit been submitted.
		it('should create the AUT row after the send resolves and the deposit is submitted', async () => {
			await fetchNearIntentsSolSwap({
				identity: mockIdentity,
				progress: mockProgress,
				sourceToken,
				destinationToken,
				swapAmount: '1',
				userAddress: mockSolAddress,
				swapDetails: mockNearIntentsQuoteResponse
			});

			const [sendOrder] = vi.mocked(sendSol).mock.invocationCallOrder;
			const [submitOrder] = vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mock
				.invocationCallOrder;
			const [createOrder] = vi.mocked(activeUserTransactionsServices.createActiveUserTransaction)
				.mock.invocationCallOrder;

			expect(sendOrder).toBeLessThan(submitOrder);
			expect(submitOrder).toBeLessThan(createOrder);
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledOnce();
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
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					externalRefs: expect.arrayContaining([
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: depositAddress },
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO, value: 'sol-memo-123' }
					])
				})
			);
		});
	});

	describe('fetchNearIntentsBtcSwap', () => {
		const sourceToken = BTC_MAINNET_TOKEN;
		const destinationToken = { ...mockValidErc20Token, decimals: 6, enabled: true };
		const mockProgress = vi.fn();
		const btcTxid = 'btc-txid-123';
		const { depositAddress } = mockNearIntentsQuoteResponse.quote;

		const baseParams = {
			identity: mockIdentity,
			progress: mockProgress,
			sourceToken,
			destinationToken,
			swapAmount: '0.01',
			userAddress: mockBtcAddress,
			network: 'mainnet' as const,
			utxosFee: mockUtxosFee,
			swapDetails: mockNearIntentsQuoteResponse
		};

		beforeEach(() => {
			vi.clearAllMocks();

			// The real `sendBtc` fires `onBroadcast` the moment the transaction is
			// broadcast, before its own bookkeeping resolves.
			vi.mocked(sendBtc).mockImplementation(async ({ onBroadcast }) => {
				await onBroadcast?.({ txid: btcTxid });
				return btcTxid;
			});
			vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mockResolvedValue(undefined);
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockResolvedValue();
		});

		it('should send the deposit to the quoted address on the quoted UTXO selection', async () => {
			await fetchNearIntentsBtcSwap(baseParams);

			expect(sendBtc).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					network: 'mainnet',
					utxosFee: mockUtxosFee,
					source: mockBtcAddress,
					destination: depositAddress,
					amount: '0.01'
				})
			);
		});

		it('should register the AUT row at broadcast time, before the send resolves', async () => {
			vi.mocked(sendBtc).mockImplementation(async ({ onBroadcast }) => {
				expect(activeUserTransactionsServices.createActiveUserTransaction).not.toHaveBeenCalled();

				await onBroadcast?.({ txid: btcTxid });

				expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledOnce();

				return btcTxid;
			});

			await fetchNearIntentsBtcSwap(baseParams);

			// Exactly once: the after-send path must not create a second row.
			expect(
				activeUserTransactionsServices.createActiveUserTransaction
			).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: {
						NearIntents: expect.objectContaining({
							source_token: { BtcNativeMainnet: null },
							// `swapAmount: '0.01'` in satoshis.
							amount: 1_000_000n
						})
					},
					externalRefs: expect.arrayContaining([
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: depositAddress }
					])
				})
			);
		});

		it('should register the row before submitting the broadcast txid to 1Click', async () => {
			await fetchNearIntentsBtcSwap(baseParams);

			const [createOrder] = vi.mocked(activeUserTransactionsServices.createActiveUserTransaction)
				.mock.invocationCallOrder;
			const [submitOrder] = vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mock
				.invocationCallOrder;

			expect(createOrder).toBeLessThan(submitOrder);

			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledExactlyOnceWith({
				depositAddress,
				txHash: btcTxid
			});
		});

		it('should include the depositMemo in the row refs and the 1Click submit when present', async () => {
			const quoteWithMemo = {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, depositMemo: 'btc-memo-123' }
			};

			await fetchNearIntentsBtcSwap({ ...baseParams, swapDetails: quoteWithMemo });

			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledWith({
				depositAddress,
				txHash: btcTxid,
				depositMemo: 'btc-memo-123'
			});
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					externalRefs: expect.arrayContaining([
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: depositAddress },
						{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO, value: 'btc-memo-123' }
					])
				})
			);
		});

		it('should report progress steps in correct order', async () => {
			await fetchNearIntentsBtcSwap(baseParams);

			expect(mockProgress).toHaveBeenCalledTimes(3);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SIGN_TRANSFER);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.SWAP);
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsSwap.UPDATE_UI);
		});

		// The deposit is already broadcast when the row is created, so a bookkeeping
		// failure must never read as the swap having failed.
		it('should not surface a failed AUT creation as a swap failure', async () => {
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockRejectedValue(
				new Error('backend down')
			);

			await expect(fetchNearIntentsBtcSwap(baseParams)).resolves.toBeUndefined();
		});

		it('should not surface a failed 1Click submit as a swap failure', async () => {
			vi.mocked(nearIntentsServices.submitNearIntentsDepositTx).mockRejectedValue(
				new Error('1click down')
			);

			await expect(fetchNearIntentsBtcSwap(baseParams)).resolves.toBeUndefined();

			// The row was registered at broadcast, so it exists despite the failed submit.
			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledOnce();
		});

		it('should surface a send failure and create no row when nothing was broadcast', async () => {
			vi.mocked(sendBtc).mockRejectedValue(new Error('signer unavailable'));

			await expect(fetchNearIntentsBtcSwap(baseParams)).rejects.toThrow('signer unavailable');

			expect(activeUserTransactionsServices.createActiveUserTransaction).not.toHaveBeenCalled();
			expect(nearIntentsServices.submitNearIntentsDepositTx).not.toHaveBeenCalled();
		});

		// `sendBtc` can still throw after the broadcast, in its best-effort bookkeeping
		// (pending-transaction registration, wallet refresh). The deposit is real by then,
		// so the swap must resolve and carry on with the broadcast txid.
		it('should not surface a sendBtc failure after the broadcast as a swap failure', async () => {
			vi.mocked(sendBtc).mockImplementation(async ({ onBroadcast }) => {
				await onBroadcast?.({ txid: btcTxid });
				throw new Error('wallet refresh failed');
			});

			await expect(fetchNearIntentsBtcSwap(baseParams)).resolves.toBeUndefined();

			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledOnce();
			expect(nearIntentsServices.submitNearIntentsDepositTx).toHaveBeenCalledExactlyOnceWith({
				depositAddress,
				txHash: btcTxid
			});
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsSwap.UPDATE_UI);
		});

		it('should enable a disabled destination token once the swap foreground resolves', async () => {
			const disabledDestinationToken = { ...destinationToken, enabled: false };

			await fetchNearIntentsBtcSwap({
				...baseParams,
				destinationToken: disabledDestinationToken
			});

			expect(setCustomToken).toHaveBeenCalledOnce();
			expect(loadCustomErc20Tokens).toHaveBeenCalledOnce();
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
