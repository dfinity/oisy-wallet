import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { send } from '$eth/services/send.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	executeOneSecEvmToIcpBridge,
	executeOneSecIcpToEvmBridge,
	fetchOneSecEvmToIcpQuote,
	fetchOneSecIcpToEvmQuote
} from '$lib/services/onesec-swap.services';
import { SwapProvider } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@icp-sdk/core/agent';
import type * as OneSecBridge from 'onesec-bridge';

const USDC_LEDGER = '53nhb-haaaa-aaaar-qbn5q-cai';

const { mockPlan, mockStep, mockExpectedFee, mockEvmToIcpBuilderObj, mockIcpToEvmBuilderObj } =
	vi.hoisted(() => {
		const mockExpectedFee = {
			transferFee: vi.fn().mockReturnValue({ inUnits: 1000n }),
			protocolFeeInPercent: vi.fn().mockReturnValue(0.1)
		};
		const mockStep = {
			run: vi.fn().mockResolvedValue({ state: 'succeeded', expectedFee: mockExpectedFee }),
			index: vi.fn().mockReturnValue(0)
		};
		const mockPlan = { nextStepToRun: vi.fn().mockReturnValue(undefined) };
		const mockEvmToIcpBuilderObj = {
			receiver: vi.fn().mockReturnThis(),
			amountInUnits: vi.fn().mockReturnThis(),
			forward: vi.fn().mockResolvedValue(mockPlan)
		};
		const mockIcpToEvmBuilderObj = {
			sender: vi.fn().mockReturnThis(),
			receiver: vi.fn().mockReturnThis(),
			amountInUnits: vi.fn().mockReturnThis(),
			build: vi.fn().mockResolvedValue(mockPlan)
		};
		return { mockPlan, mockStep, mockExpectedFee, mockEvmToIcpBuilderObj, mockIcpToEvmBuilderObj };
	});

vi.mock('onesec-bridge', async (importOriginal) => {
	const actual = await importOriginal<typeof OneSecBridge>();
	return {
		...actual,
		// Must use regular functions (not arrow functions) — Vitest uses Reflect.construct
		// when `new` is used, which requires a constructable function.
		/* eslint-disable prefer-arrow/prefer-arrow-functions, prefer-arrow-callback */
		EvmToIcpBridgeBuilder: vi.fn().mockImplementation(function () {
			return mockEvmToIcpBuilderObj;
		}),
		IcpToEvmBridgeBuilder: vi.fn().mockImplementation(function () {
			return mockIcpToEvmBuilderObj;
		})
		/* eslint-enable prefer-arrow/prefer-arrow-functions, prefer-arrow-callback */
	};
});

let mockEnabled = true;
vi.mock('$env/rest/onesec.env', () => ({
	get ONESEC_SWAP_ENABLED() {
		return mockEnabled;
	}
}));

let currentIdentity: Identity | null = mockIdentity;
vi.mock('$lib/derived/auth.derived', () => ({
	get authIdentity() {
		return {
			subscribe: (fn: (v: Identity | null) => void) => {
				fn(currentIdentity);
				return () => {};
			}
		};
	}
}));

vi.mock('$lib/actors/agents.ic', () => ({
	getAgent: vi.fn().mockResolvedValue({})
}));

vi.mock('$eth/services/send.services', () => ({
	send: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

const makeIcToken = (ledgerCanisterId: string): IcToken => ({
	...mockValidIcToken,
	ledgerCanisterId
});

const makeErc20Token = (address = mockEthAddress): Erc20Token => ({
	...mockValidErc20Token,
	id: parseTokenId(`Erc20-${address}`),
	address,
	network: ETHEREUM_NETWORK
});

const mockIcDestToken = makeIcToken(USDC_LEDGER);
const mockIcSrcToken = makeIcToken(USDC_LEDGER);
const mockEvmSrcToken = makeErc20Token('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
const mockEvmDestToken = makeErc20Token();

const baseEvmQuoteParams = {
	sourceToken: mockEvmSrcToken,
	destinationToken: mockIcDestToken,
	amount: 1_000_000n,
	userAddress: mockEthAddress,
	slippage: 1
};

const baseIcpQuoteParams = {
	sourceToken: mockIcSrcToken,
	destinationToken: mockEvmDestToken,
	amount: 1_000_000n,
	userEthAddress: mockEthAddress,
	slippage: 1
};

const baseIcpToEvmParams = {
	identity: mockIdentity,
	progress: vi.fn(),
	sourceToken: mockIcSrcToken,
	destinationToken: mockEvmDestToken,
	swapAmount: 1,
	userEthAddress: mockEthAddress,
	setFailedProgressStep: vi.fn()
};

const baseEvmToIcpParams = {
	identity: mockIdentity,
	progress: vi.fn(),
	sourceToken: mockEvmSrcToken,
	destinationToken: mockIcDestToken,
	swapAmount: 1,
	userEthAddress: mockEthAddress,
	gas: 21000n,
	maxFeePerGas: 1_000_000_000n,
	maxPriorityFeePerGas: 1_000_000_000n,
	setFailedProgressStep: vi.fn()
};

describe('onesec-swap.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnabled = true;
		currentIdentity = mockIdentity;

		mockEvmToIcpBuilderObj.receiver.mockReturnThis();
		mockEvmToIcpBuilderObj.amountInUnits.mockReturnThis();
		mockEvmToIcpBuilderObj.forward.mockResolvedValue(mockPlan);

		mockIcpToEvmBuilderObj.sender.mockReturnThis();
		mockIcpToEvmBuilderObj.receiver.mockReturnThis();
		mockIcpToEvmBuilderObj.amountInUnits.mockReturnThis();
		mockIcpToEvmBuilderObj.build.mockResolvedValue(mockPlan);

		mockPlan.nextStepToRun.mockReturnValue(undefined);
		mockStep.run.mockResolvedValue({ state: 'succeeded', expectedFee: mockExpectedFee });
		mockStep.index.mockReturnValue(0);
		mockExpectedFee.transferFee.mockReturnValue({ inUnits: 1000n });
		mockExpectedFee.protocolFeeInPercent.mockReturnValue(0.1);
	});

	describe('fetchOneSecEvmToIcpQuote', () => {
		it('returns undefined when ONESEC_SWAP_ENABLED is false', async () => {
			mockEnabled = false;

			await expect(fetchOneSecEvmToIcpQuote(baseEvmQuoteParams)).resolves.toBeUndefined();
		});

		it('returns undefined when identity is null', async () => {
			currentIdentity = null;

			await expect(fetchOneSecEvmToIcpQuote(baseEvmQuoteParams)).resolves.toBeUndefined();
		});

		it('returns undefined when destination is not on ICP network', async () => {
			await expect(
				fetchOneSecEvmToIcpQuote({ ...baseEvmQuoteParams, destinationToken: mockEvmDestToken })
			).resolves.toBeUndefined();
		});

		it('returns undefined when destination token is not in ICP_LEDGER_TO_TOKEN', async () => {
			await expect(
				fetchOneSecEvmToIcpQuote({
					...baseEvmQuoteParams,
					destinationToken: makeIcToken('unknown-canister-id')
				})
			).resolves.toBeUndefined();
		});

		it('returns undefined when plan has no steps', async () => {
			mockPlan.nextStepToRun.mockReturnValue(undefined);

			await expect(fetchOneSecEvmToIcpQuote(baseEvmQuoteParams)).resolves.toBeUndefined();
		});

		it('returns undefined when step state is not succeeded', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep);
			mockStep.run.mockResolvedValue({ state: 'failed' });

			await expect(fetchOneSecEvmToIcpQuote(baseEvmQuoteParams)).resolves.toBeUndefined();
		});

		it('returns undefined when step has no expectedFee', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep);
			mockStep.run.mockResolvedValue({ state: 'succeeded' });

			await expect(fetchOneSecEvmToIcpQuote(baseEvmQuoteParams)).resolves.toBeUndefined();
		});

		it('returns a SwapMappedResult on success', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			const result = await fetchOneSecEvmToIcpQuote(baseEvmQuoteParams);

			expect(result).toBeDefined();
			expect(result?.provider).toBe(SwapProvider.ONE_SEC);
			expect(result?.receiveAmount).toBeTypeOf('bigint');
			expect(result?.swapDetails).toMatchObject({
				transferFeeInUnits: 1000n,
				protocolFeeInPercent: 0.1
			});
		});

		it('logs error and returns undefined when the builder throws', async () => {
			mockEvmToIcpBuilderObj.forward.mockRejectedValue(new Error('network error'));
			const result = await fetchOneSecEvmToIcpQuote(baseEvmQuoteParams);

			expect(result).toBeUndefined();
		});
	});

	describe('fetchOneSecIcpToEvmQuote', () => {
		it('returns undefined when ONESEC_SWAP_ENABLED is false', async () => {
			mockEnabled = false;

			await expect(fetchOneSecIcpToEvmQuote(baseIcpQuoteParams)).resolves.toBeUndefined();
		});

		it('returns undefined when identity is null', async () => {
			currentIdentity = null;

			await expect(fetchOneSecIcpToEvmQuote(baseIcpQuoteParams)).resolves.toBeUndefined();
		});

		it('returns undefined when source is not an IcToken', async () => {
			await expect(
				fetchOneSecIcpToEvmQuote({ ...baseIcpQuoteParams, sourceToken: mockEvmSrcToken })
			).resolves.toBeUndefined();
		});

		it('returns undefined when userEthAddress is null', async () => {
			await expect(
				fetchOneSecIcpToEvmQuote({ ...baseIcpQuoteParams, userEthAddress: null })
			).resolves.toBeUndefined();
		});

		it('returns undefined when source token is not in ICP_LEDGER_TO_TOKEN', async () => {
			await expect(
				fetchOneSecIcpToEvmQuote({
					...baseIcpQuoteParams,
					sourceToken: makeIcToken('unknown-canister-id')
				})
			).resolves.toBeUndefined();
		});

		it('returns a SwapMappedResult on success', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			const result = await fetchOneSecIcpToEvmQuote(baseIcpQuoteParams);

			expect(result).toBeDefined();
			expect(result?.provider).toBe(SwapProvider.ONE_SEC);
			expect(result?.receiveAmount).toBeTypeOf('bigint');
			expect(result?.swapDetails).toMatchObject({
				transferFeeInUnits: 1000n,
				protocolFeeInPercent: 0.1
			});
		});

		it('logs error and returns undefined when the builder throws', async () => {
			mockIcpToEvmBuilderObj.build.mockRejectedValue(new Error('network error'));

			await expect(fetchOneSecIcpToEvmQuote(baseIcpQuoteParams)).resolves.toBeUndefined();
		});
	});

	describe('executeOneSecIcpToEvmBridge', () => {
		it('throws when source token is not in ICP_LEDGER_TO_TOKEN', async () => {
			await expect(
				executeOneSecIcpToEvmBridge({
					...baseIcpToEvmParams,
					sourceToken: makeIcToken('unknown-canister-id')
				})
			).rejects.toThrow('Source token is not supported by the OneSec bridge');
		});

		it('throws and calls setFailedProgressStep when a step fails', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			mockStep.run.mockResolvedValue({ state: 'failed', error: { message: 'step error' } });

			await expect(executeOneSecIcpToEvmBridge(baseIcpToEvmParams)).rejects.toThrow('step error');
			expect(baseIcpToEvmParams.setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		});

		it('calls progress(SWAP) only for steps with index >= 1', async () => {
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep)
				.mockReturnValueOnce(mockStep)
				.mockReturnValue(undefined);
			mockStep.index.mockReturnValueOnce(0).mockReturnValueOnce(1);
			mockStep.run.mockResolvedValue({ state: 'succeeded' });

			const progress = vi.fn();
			await executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, progress });

			expect(progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSwap.SWAP);
		});

		it('completes successfully when all steps succeed', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			mockStep.run.mockResolvedValue({ state: 'succeeded' });

			await expect(executeOneSecIcpToEvmBridge(baseIcpToEvmParams)).resolves.toBeUndefined();
		});
	});

	describe('executeOneSecEvmToIcpBridge', () => {
		it('throws when destination token is not in ICP_LEDGER_TO_TOKEN', async () => {
			await expect(
				executeOneSecEvmToIcpBridge({
					...baseEvmToIcpParams,
					destinationToken: makeIcToken('unknown-canister-id')
				})
			).rejects.toThrow('Destination token is not supported by the OneSec bridge');
		});

		it('throws and calls setFailedProgressStep when the fee step fails', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep);
			mockStep.run.mockResolvedValue({ state: 'failed', error: { message: 'fee error' } });

			await expect(executeOneSecEvmToIcpBridge(baseEvmToIcpParams)).rejects.toThrow('fee error');
			expect(baseEvmToIcpParams.setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		});

		it('throws when the forwarding address step is missing', async () => {
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep) // fee step
				.mockReturnValue(undefined); // no forwarding step
			mockStep.run.mockResolvedValue({ state: 'succeeded' });

			await expect(executeOneSecEvmToIcpBridge(baseEvmToIcpParams)).rejects.toThrow(
				'OneSec bridge plan is missing the forwarding address step'
			);
		});

		it('throws when the forwarding address is null', async () => {
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep) // fee step
				.mockReturnValueOnce(mockStep) // forwarding step
				.mockReturnValue(undefined);
			mockStep.run
				.mockResolvedValueOnce({ state: 'succeeded' })
				.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress: null });

			await expect(executeOneSecEvmToIcpBridge(baseEvmToIcpParams)).rejects.toThrow(
				'Failed to compute the OneSec forwarding address'
			);
		});

		it('calls send with the forwarding address', async () => {
			const forwardingAddress = '0xdeadbeef';
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep) // fee step
				.mockReturnValueOnce(mockStep) // forwarding step
				.mockReturnValue(undefined); // no remaining steps
			mockStep.run
				.mockResolvedValueOnce({ state: 'succeeded' })
				.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress });

			await executeOneSecEvmToIcpBridge(baseEvmToIcpParams);

			expect(vi.mocked(send)).toHaveBeenCalledWith(
				expect.objectContaining({ to: forwardingAddress })
			);
		});

		it('calls progress(SWAP) before sending', async () => {
			const forwardingAddress = '0xdeadbeef';
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep) // fee step
				.mockReturnValueOnce(mockStep) // forwarding step
				.mockReturnValue(undefined);
			mockStep.run
				.mockResolvedValueOnce({ state: 'succeeded' })
				.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress });

			const progress = vi.fn();
			await executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, progress });

			expect(progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(progress.mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(send).mock.invocationCallOrder[0]
			);
		});

		it('throws and calls setFailedProgressStep when a remaining step fails', async () => {
			const forwardingAddress = '0xdeadbeef';
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep) // fee step
				.mockReturnValueOnce(mockStep) // forwarding step
				.mockReturnValueOnce(mockStep) // remaining step
				.mockReturnValue(undefined);
			mockStep.run
				.mockResolvedValueOnce({ state: 'succeeded' })
				.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress })
				.mockResolvedValueOnce({ state: 'failed', error: { message: 'bridge failed' } });

			await expect(executeOneSecEvmToIcpBridge(baseEvmToIcpParams)).rejects.toThrow(
				'bridge failed'
			);
			expect(baseEvmToIcpParams.setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		});
	});
});
