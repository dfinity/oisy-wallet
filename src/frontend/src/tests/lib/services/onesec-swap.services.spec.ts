import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { send } from '$eth/services/send.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import {
	executeOneSecEvmToIcpBridge,
	executeOneSecIcpToEvmBridge,
	fetchOneSecEvmToIcpQuote,
	fetchOneSecIcpToEvmQuote,
	pollOneSecActiveUserTransactions
} from '$lib/services/onesec-swap.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { ONESEC_EXTERNAL_REF_KEYS } from '$lib/types/onesec-swap';
import { SwapProvider } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	mockActiveUserTransaction,
	mockOneSecIcpToEvmData
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type * as OneSecBridge from 'onesec-bridge';

const USDC_LEDGER = '53nhb-haaaa-aaaar-qbn5q-cai';

const { getTransfersMock, getTransferMock, getForwardingStatusMock } = vi.hoisted(() => ({
	getTransfersMock: vi.fn(),
	getTransferMock: vi.fn(),
	getForwardingStatusMock: vi.fn()
}));

const { mockPlan, mockStep, mockExpectedFee, mockEvmToIcpBuilderObj, mockIcpToEvmBuilderObj } =
	vi.hoisted(() => {
		const mockExpectedFee = {
			transferFee: vi.fn().mockReturnValue({ inUnits: 1000n }),
			protocolFeeInPercent: vi.fn().mockReturnValue(0.1)
		};
		const mockStep = {
			run: vi.fn().mockResolvedValue({ state: 'succeeded', expectedFee: mockExpectedFee }),
			index: vi.fn().mockReturnValue(0),
			status: vi.fn().mockReturnValue({ state: 'succeeded' }),
			getTransferId: vi.fn().mockReturnValue(undefined),
			getLastTransferId: vi.fn().mockReturnValue(undefined)
		};
		const mockPlan = {
			nextStepToRun: vi.fn().mockReturnValue(undefined),
			latestStep: vi.fn().mockReturnValue(undefined)
		};
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
		}),
		/* eslint-enable prefer-arrow/prefer-arrow-functions, prefer-arrow-callback */
		getTransfers: getTransfersMock,
		oneSecForwarding: vi.fn().mockReturnValue({
			getTransfer: getTransferMock,
			getForwardingStatus: getForwardingStatusMock
		})
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
	setFailedProgressStep: vi.fn(),
	swapId: 'icp-to-evm-default-aut-id'
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
	setFailedProgressStep: vi.fn(),
	swapId: 'evm-to-icp-default-aut-id'
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
		mockPlan.latestStep.mockReturnValue(undefined);
		mockStep.run.mockResolvedValue({ state: 'succeeded', expectedFee: mockExpectedFee });
		mockStep.index.mockReturnValue(0);
		mockStep.status.mockReturnValue({ state: 'succeeded' });
		mockStep.getTransferId.mockReturnValue(undefined);
		mockStep.getLastTransferId.mockReturnValue(undefined);
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

		it('throws with the verbose message when a foreground step ends in refunded', async () => {
			// The SDK uses `verbose` (not `error.message`) to carry the refund
			// reason; surface it as the foreground error.
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			mockStep.run.mockResolvedValue({
				state: 'refunded',
				verbose: 'refunded USDC due to insufficient tokens on Base'
			});

			await expect(executeOneSecIcpToEvmBridge(baseIcpToEvmParams)).rejects.toThrow(
				'refunded USDC due to insufficient tokens on Base'
			);
			expect(baseIcpToEvmParams.setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		});

		it('calls progress(SWAP) only for steps with index >= 1', async () => {
			mockPlan.nextStepToRun
				.mockReturnValueOnce(mockStep)
				.mockReturnValueOnce(mockStep)
				.mockReturnValue(undefined);
			mockStep.index.mockReturnValueOnce(0).mockReturnValueOnce(1);
			// The second step is the transfer step — surfaces a transferId on
			// the step instance (not on the run() result).
			mockStep.run
				.mockResolvedValueOnce({ state: 'succeeded' })
				.mockResolvedValueOnce({ state: 'succeeded' });
			mockStep.getTransferId.mockReturnValueOnce(undefined).mockReturnValueOnce({ id: 42n });

			const progress = vi.fn();
			await executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, progress });

			expect(progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSwap.SWAP);
		});

		it('foreground resolves once a step exposes a transferId', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			mockStep.run.mockResolvedValue({ state: 'succeeded' });
			mockStep.getTransferId.mockReturnValue({ id: 42n });

			await expect(executeOneSecIcpToEvmBridge(baseIcpToEvmParams)).resolves.toBeUndefined();
		});

		it('foreground throws if the plan halts before initiating a transfer', async () => {
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			mockStep.run.mockResolvedValue({ state: 'succeeded' });
			mockPlan.latestStep.mockReturnValue(mockStep);
			mockStep.status.mockReturnValue({ state: 'failed' });

			await expect(executeOneSecIcpToEvmBridge(baseIcpToEvmParams)).rejects.toThrow(
				'OneSec bridge plan did not initiate a transfer'
			);
		});

		it('foreground resolves cleanly when the plan completes without surfacing a transferId', async () => {
			// Belt-and-suspenders: if the SDK ever finishes a plan without
			// flagging a transferId but no step actually failed, the wizard
			// should still close (the background phase will finalize).
			mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
			mockStep.run.mockResolvedValue({ state: 'succeeded' });

			await expect(executeOneSecIcpToEvmBridge(baseIcpToEvmParams)).resolves.toBeUndefined();
		});

		describe('AUT row lifecycle', () => {
			let createSpy: ReturnType<typeof vi.spyOn>;
			let updateSpy: ReturnType<typeof vi.spyOn>;
			const swapId = 'icp-to-evm-aut-id';

			beforeEach(() => {
				activeUserTransactionsStore.reset();
				localStorage.clear();
				activeUserTransactionsStore.init(mockIdentity.getPrincipal());

				createSpy = vi
					.spyOn(activeUserTransactionsServices, 'createActiveUserTransaction')
					.mockResolvedValue();
				updateSpy = vi
					.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction')
					.mockResolvedValue();
			});

			it('creates the AUT row exactly once on foreground success, with the TRANSFER_ID ref', async () => {
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep)
					.mockReturnValueOnce(mockStep)
					.mockReturnValue(undefined);
				mockStep.index.mockReturnValueOnce(0).mockReturnValueOnce(1);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded' });
				mockStep.getTransferId.mockReturnValueOnce(undefined).mockReturnValueOnce({ id: 42n });

				await executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, swapId });

				expect(createSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						id: swapId,
						externalRefs: expect.arrayContaining([
							{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '42' }
						])
					})
				);
			});

			it('does not create a row when a foreground step fails', async () => {
				mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
				mockStep.run.mockResolvedValue({ state: 'failed', error: { message: 'boom' } });

				await expect(
					executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, swapId })
				).rejects.toThrow('boom');

				expect(createSpy).not.toHaveBeenCalled();
				expect(updateSpy).not.toHaveBeenCalled();
			});

			it('does not create a row when the plan halts before initiating a transfer', async () => {
				mockPlan.nextStepToRun.mockReturnValueOnce(mockStep).mockReturnValue(undefined);
				mockStep.run.mockResolvedValue({ state: 'succeeded' });
				mockPlan.latestStep.mockReturnValue(mockStep);
				mockStep.status.mockReturnValue({ state: 'failed' });

				await expect(
					executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, swapId })
				).rejects.toThrow('OneSec bridge plan did not initiate a transfer');

				expect(createSpy).not.toHaveBeenCalled();
			});

			it('the in-session closer writes Succeeded after the remaining plan completes', async () => {
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // foreground: fee
					.mockReturnValueOnce(mockStep) // foreground: transfer (transferId)
					.mockReturnValue(undefined); // no remaining steps
				mockStep.index.mockReturnValueOnce(0).mockReturnValueOnce(1);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded' });
				mockStep.getTransferId.mockReturnValueOnce(undefined).mockReturnValueOnce({ id: 42n });

				await executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, swapId });

				await vi.waitFor(() => {
					expect(updateSpy.mock.calls.at(-1)?.[0]).toMatchObject({
						id: swapId,
						status: { Succeeded: null }
					});
				});
			});

			it('the in-session closer writes Failed (with verbose) when a remaining step ends in refunded', async () => {
				const refundedVerbose =
					'refunded USDC to {principal} on ICP due to insufficient tokens on Base';

				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // foreground: fee
					.mockReturnValueOnce(mockStep) // foreground: transfer (transferId)
					.mockReturnValueOnce(mockStep) // closer: validate-receipt (refunds)
					.mockReturnValue(undefined);
				mockStep.index.mockReturnValueOnce(0).mockReturnValueOnce(1);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'refunded', verbose: refundedVerbose });
				mockStep.getTransferId.mockReturnValueOnce(undefined).mockReturnValueOnce({ id: 42n });
				mockPlan.latestStep.mockReturnValue(mockStep);
				mockStep.status.mockReturnValue({ state: 'refunded', verbose: refundedVerbose });

				await executeOneSecIcpToEvmBridge({ ...baseIcpToEvmParams, swapId });

				await vi.waitFor(() => {
					expect(updateSpy.mock.calls.at(-1)?.[0]).toMatchObject({
						id: swapId,
						status: { Failed: null },
						error: refundedVerbose
					});
				});
			});
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

		describe('AUT row lifecycle', () => {
			let createSpy: ReturnType<typeof vi.spyOn>;
			let updateSpy: ReturnType<typeof vi.spyOn>;
			const swapId = 'evm-to-icp-aut-id';
			const forwardingAddress = '0xdeadbeef';

			beforeEach(() => {
				activeUserTransactionsStore.reset();
				localStorage.clear();
				activeUserTransactionsStore.init(mockIdentity.getPrincipal());

				createSpy = vi
					.spyOn(activeUserTransactionsServices, 'createActiveUserTransaction')
					.mockResolvedValue();
				updateSpy = vi
					.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction')
					.mockResolvedValue();
			});

			it('creates the AUT row exactly once after `send()` succeeds, with FORWARDING_ADDRESS and BASELINE_TRANSFER_ID refs', async () => {
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // fee
					.mockReturnValueOnce(mockStep) // forwarding
					.mockReturnValue(undefined);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress });
				mockStep.getLastTransferId.mockReturnValue(undefined);

				await executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId });

				expect(createSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						id: swapId,
						externalRefs: expect.arrayContaining([
							{ key: ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS, value: forwardingAddress },
							{ key: ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID, value: '0' }
						])
					})
				);
			});

			it('persists the prior `done` id as BASELINE_TRANSFER_ID when the user has previous forwarding', async () => {
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // fee
					.mockReturnValueOnce(mockStep) // forwarding
					.mockReturnValue(undefined);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress });
				mockStep.getLastTransferId.mockReturnValue({ id: 42n });

				await executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId });

				expect(createSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						id: swapId,
						externalRefs: expect.arrayContaining([
							{ key: ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID, value: '42' }
						])
					})
				);
			});

			it('does not create a row when the fee step fails', async () => {
				mockPlan.nextStepToRun.mockReturnValueOnce(mockStep);
				mockStep.run.mockResolvedValue({ state: 'failed', error: { message: 'fee error' } });

				await expect(
					executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId })
				).rejects.toThrow('fee error');

				expect(createSpy).not.toHaveBeenCalled();
				expect(updateSpy).not.toHaveBeenCalled();
			});

			it('does not create a row when computing the forwarding address fails', async () => {
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // fee
					.mockReturnValueOnce(mockStep) // forwarding
					.mockReturnValue(undefined);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress: null });

				await expect(
					executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId })
				).rejects.toThrow('Failed to compute the OneSec forwarding address');

				expect(createSpy).not.toHaveBeenCalled();
				expect(updateSpy).not.toHaveBeenCalled();
			});

			it('the in-session closer persists TRANSFER_ID when a remaining step exposes one', async () => {
				const transferStep = {
					...mockStep,
					run: vi.fn().mockResolvedValue({ state: 'succeeded' }),
					getTransferId: vi.fn().mockReturnValue({ id: 77n }),
					getLastTransferId: vi.fn().mockReturnValue(undefined)
				};
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // fee
					.mockReturnValueOnce(mockStep) // forwarding
					.mockReturnValueOnce(transferStep) // closer step that exposes transferId
					.mockReturnValue(undefined);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress });

				await executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId });

				await vi.waitFor(() => {
					const transferIdCall = updateSpy.mock.calls.find((call: unknown[]) => {
						const [arg] = call as [{ externalRefs?: { key: string; value: string }[] }];
						return arg.externalRefs?.some(
							({ key, value }) => key === ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID && value === '77'
						);
					});

					expect(transferIdCall).toBeDefined();
				});
			});

			it('the in-session closer writes Succeeded after the remaining plan completes', async () => {
				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // fee
					.mockReturnValueOnce(mockStep) // forwarding
					.mockReturnValue(undefined);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress });

				await executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId });

				await vi.waitFor(() => {
					expect(updateSpy.mock.calls.at(-1)?.[0]).toMatchObject({
						id: swapId,
						status: { Succeeded: null }
					});
				});
			});

			it('the in-session closer writes Failed when a remaining step fails', async () => {
				const verbose = 'bridge contract reverted';

				mockPlan.nextStepToRun
					.mockReturnValueOnce(mockStep) // foreground: fee
					.mockReturnValueOnce(mockStep) // foreground: forwarding
					.mockReturnValueOnce(mockStep) // closer: validate-receipt
					.mockReturnValue(undefined);
				mockStep.run
					.mockResolvedValueOnce({ state: 'succeeded' })
					.mockResolvedValueOnce({ state: 'succeeded', forwardingAddress })
					.mockResolvedValueOnce({ state: 'failed', verbose });
				mockPlan.latestStep.mockReturnValue(mockStep);
				mockStep.status.mockReturnValue({ state: 'failed', verbose });

				await executeOneSecEvmToIcpBridge({ ...baseEvmToIcpParams, swapId });

				await vi.waitFor(() => {
					expect(updateSpy.mock.calls.at(-1)?.[0]).toMatchObject({
						id: swapId,
						status: { Failed: null },
						error: verbose
					});
				});

				expect(baseEvmToIcpParams.setFailedProgressStep).not.toHaveBeenCalled();
			});
		});
	});

	describe('pollOneSecActiveUserTransactions', () => {
		const pendingTx = { ...mockActiveUserTransaction, status: { Pending: null as null } };
		const sourceAmount = mockOneSecIcpToEvmData.amount;
		const txWithTransferId = {
			...pendingTx,
			external_refs: [{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '42' }]
		};

		// EVM→ICP row with a forwarding address ref AND a baseline transferId ref
		// but no transfer id — the scenario the discovery path is designed for.
		// The baseline is what the foreground captured before the user's deposit;
		// the poller's discovery is gated on `response.done.id > baseline` to
		// reject stale `done` values from previous swaps to the same address.
		const evmToIcpForwardingAddress = '0xforward000000000000000000000000000000ee';
		const evmToIcpBaselineTransferId = '5';
		const evmToIcpPendingTx = {
			...pendingTx,
			id: 'evm-to-icp-tx',
			data: {
				OneSecEvmToIcp: {
					recipient_principal: mockIdentity.getPrincipal(),
					source_token: {
						Erc20: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1n] as [string, bigint]
					},
					dest_token: { Icrc: Principal.fromText(USDC_LEDGER) },
					amount: sourceAmount
				}
			},
			external_refs: [
				{
					key: ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS,
					value: evmToIcpForwardingAddress
				},
				{
					key: ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID,
					value: evmToIcpBaselineTransferId
				}
			]
		};

		beforeEach(() => {
			vi.clearAllMocks();
			getTransfersMock.mockReset();
			getTransferMock.mockReset();
			getForwardingStatusMock.mockReset();
		});

		it('no-ops on an empty list and does not call the SDK', async () => {
			const applySpy = vi.spyOn(
				activeUserTransactionsServices,
				'applyActiveUserTransactionPollUpdate'
			);

			await pollOneSecActiveUserTransactions({ identity: mockIdentity, transactions: [] });

			expect(getTransfersMock).not.toHaveBeenCalled();
			expect(getTransferMock).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('issues a single getTransfers call for a batch of listing-matched rows', async () => {
			getTransfersMock.mockResolvedValueOnce([
				{
					source: { chain: 'ICP', amount: sourceAmount },
					destination: { chain: 'Ethereum', amount: sourceAmount },
					status: { PendingSourceTx: null }
				}
			]);
			vi.spyOn(
				activeUserTransactionsServices,
				'applyActiveUserTransactionPollUpdate'
			).mockResolvedValue();

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx, { ...pendingTx, id: 'tx-2' }]
			});

			expect(getTransfersMock).toHaveBeenCalledOnce();
		});

		it('advances Pending → Executing from a listing match (in-flight transfer)', async () => {
			getTransfersMock.mockResolvedValueOnce([
				{
					source: { chain: 'ICP', amount: sourceAmount },
					destination: { chain: 'Ethereum', amount: sourceAmount },
					status: { PendingSourceTx: null }
				}
			]);
			const applySpy = vi
				.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
				.mockResolvedValue();

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Executing: null } })
				})
			);
		});

		it('drops a terminal candidate from a listing match (stale historical transfer)', async () => {
			// `getTransfers` returns transfers without their ids, so an old
			// same-amount/same-direction transfer can collide with a new Pending
			// row. Terminal verdicts must come from an exact-transferId lookup.
			getTransfersMock.mockResolvedValueOnce([
				{
					source: { chain: 'ICP', amount: sourceAmount },
					destination: { chain: 'Ethereum', amount: sourceAmount },
					status: { Succeeded: null }
				}
			]);
			const applySpy = vi.spyOn(
				activeUserTransactionsServices,
				'applyActiveUserTransactionPollUpdate'
			);

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('uses oneSecForwarding().getTransfer for rows with a TRANSFER_ID ref', async () => {
			getTransferMock.mockResolvedValueOnce({
				source: { chain: 'ICP', amount: sourceAmount },
				destination: { chain: 'Ethereum', amount: sourceAmount },
				status: { Succeeded: null }
			});
			const applySpy = vi
				.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
				.mockResolvedValue();

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [txWithTransferId]
			});

			expect(getTransferMock).toHaveBeenCalledExactlyOnceWith({ id: 42n });
			expect(getTransfersMock).not.toHaveBeenCalled();
			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Succeeded: null } })
				})
			);
		});

		it('forwards the failure message from an exact-transferId lookup', async () => {
			getTransferMock.mockResolvedValueOnce({
				source: { chain: 'ICP', amount: sourceAmount },
				destination: { chain: 'Ethereum', amount: sourceAmount },
				status: { Failed: { error: 'reverted' } }
			});
			const applySpy = vi
				.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
				.mockResolvedValue();

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [txWithTransferId]
			});

			expect(applySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Failed: null }, error: 'reverted' })
				})
			);
		});

		it('skips when no matching transfer is found', async () => {
			getTransfersMock.mockResolvedValueOnce([]);
			const applySpy = vi.spyOn(
				activeUserTransactionsServices,
				'applyActiveUserTransactionPollUpdate'
			);

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('skips when the candidate status would not advance the row', async () => {
			// PendingSourceTx → Executing, but the row is already Executing — no write.
			getTransfersMock.mockResolvedValueOnce([
				{
					source: { chain: 'ICP', amount: sourceAmount },
					destination: { chain: 'Ethereum', amount: sourceAmount },
					status: { PendingSourceTx: null }
				}
			]);
			const applySpy = vi.spyOn(
				activeUserTransactionsServices,
				'applyActiveUserTransactionPollUpdate'
			);

			await pollOneSecActiveUserTransactions({
				identity: mockIdentity,
				transactions: [{ ...pendingTx, status: { Executing: null } }]
			});

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('swallows SDK errors so the next tick can retry', async () => {
			getTransfersMock.mockRejectedValueOnce(new Error('network blip'));

			await expect(
				pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [pendingTx]
				})
			).resolves.toBeUndefined();
		});

		it('swallows getTransfer SDK errors so the next tick can retry', async () => {
			getTransferMock.mockRejectedValueOnce(new Error('transfer not found yet'));

			await expect(
				pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [txWithTransferId]
				})
			).resolves.toBeUndefined();
		});

		describe('EVM→ICP transferId discovery via getForwardingStatus', () => {
			it('discovers the transferId when done.id > baseline, persists it, and advances status via exact lookup', async () => {
				// baseline = 5; OneSec returns done = 99 → strictly greater, accepted.
				getForwardingStatusMock.mockResolvedValueOnce({ done: { id: 99n } });
				getTransferMock.mockResolvedValueOnce({
					source: { chain: 'Ethereum', amount: sourceAmount },
					destination: { chain: 'ICP', amount: sourceAmount },
					status: { Succeeded: null }
				});
				const updateSpy = vi
					.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction')
					.mockResolvedValue();
				const applySpy = vi
					.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
					.mockResolvedValue();

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [evmToIcpPendingTx]
				});

				expect(getForwardingStatusMock).toHaveBeenCalledExactlyOnceWith(
					'USDC',
					'Ethereum',
					evmToIcpForwardingAddress,
					{ owner: mockIdentity.getPrincipal() }
				);
				expect(updateSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						id: evmToIcpPendingTx.id,
						externalRefs: expect.arrayContaining([
							{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '99' }
						])
					})
				);
				expect(getTransferMock).toHaveBeenCalledExactlyOnceWith({ id: 99n });
				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({ status: { Succeeded: null } })
					})
				);
			});

			it('does not persist or advance when done.id equals the baseline (stale)', async () => {
				// baseline = 5; OneSec returns the same `done = 5` from the previous swap
				// because the new deposit hasn't been processed yet. Must be rejected.
				getForwardingStatusMock.mockResolvedValueOnce({
					done: { id: BigInt(evmToIcpBaselineTransferId) }
				});
				getTransfersMock.mockResolvedValueOnce([]);
				const updateSpy = vi.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction');
				const applySpy = vi.spyOn(
					activeUserTransactionsServices,
					'applyActiveUserTransactionPollUpdate'
				);

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [evmToIcpPendingTx]
				});

				expect(getForwardingStatusMock).toHaveBeenCalledOnce();
				expect(updateSpy).not.toHaveBeenCalled();
				expect(getTransferMock).not.toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
			});

			it('does not persist or advance when done.id is less than the baseline', async () => {
				getForwardingStatusMock.mockResolvedValueOnce({ done: { id: 1n } });
				getTransfersMock.mockResolvedValueOnce([]);
				const updateSpy = vi.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction');

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [evmToIcpPendingTx]
				});

				expect(updateSpy).not.toHaveBeenCalled();
				expect(getTransferMock).not.toHaveBeenCalled();
			});

			it('does not call getForwardingStatus when the baseline ref is missing', async () => {
				// Pre-baseline AUT rows (or rows whose foreground bailed before
				// persisting the baseline) cannot safely discover via `done`,
				// because we can't tell new from stale. Skip discovery; fall back
				// to listing match (which is guarded against terminal writes).
				getTransfersMock.mockResolvedValueOnce([]);
				const updateSpy = vi.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction');

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [
						{
							...evmToIcpPendingTx,
							external_refs: [
								{
									key: ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS,
									value: evmToIcpForwardingAddress
								}
							]
						}
					]
				});

				expect(getForwardingStatusMock).not.toHaveBeenCalled();
				expect(updateSpy).not.toHaveBeenCalled();
			});

			it('accepts done.id = 1 when baseline = "0" (first-ever swap sentinel)', async () => {
				// "0" is the sentinel the foreground writes when the user has no
				// prior completed forwarding. Any positive done.id is strictly
				// greater than 0 and must be accepted.
				getForwardingStatusMock.mockResolvedValueOnce({ done: { id: 1n } });
				getTransferMock.mockResolvedValueOnce({
					source: { chain: 'Ethereum', amount: sourceAmount },
					destination: { chain: 'ICP', amount: sourceAmount },
					status: { PendingDestinationTx: null }
				});
				const updateSpy = vi
					.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction')
					.mockResolvedValue();
				vi.spyOn(
					activeUserTransactionsServices,
					'applyActiveUserTransactionPollUpdate'
				).mockResolvedValue();

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [
						{
							...evmToIcpPendingTx,
							external_refs: [
								{
									key: ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS,
									value: evmToIcpForwardingAddress
								},
								{ key: ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID, value: '0' }
							]
						}
					]
				});

				expect(updateSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						externalRefs: expect.arrayContaining([
							{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '1' }
						])
					})
				);
				expect(getTransferMock).toHaveBeenCalledExactlyOnceWith({ id: 1n });
			});

			it('does not persist or advance when getForwardingStatus has no done id', async () => {
				getForwardingStatusMock.mockResolvedValueOnce({
					status: { CheckingBalance: null }
				});
				getTransfersMock.mockResolvedValueOnce([]);
				const updateSpy = vi.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction');
				const applySpy = vi.spyOn(
					activeUserTransactionsServices,
					'applyActiveUserTransactionPollUpdate'
				);

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [evmToIcpPendingTx]
				});

				expect(getForwardingStatusMock).toHaveBeenCalledOnce();
				expect(updateSpy).not.toHaveBeenCalled();
				expect(getTransferMock).not.toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
			});

			it('does not call getForwardingStatus for ICP→EVM rows', async () => {
				getTransfersMock.mockResolvedValueOnce([]);

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [pendingTx]
				});

				expect(getForwardingStatusMock).not.toHaveBeenCalled();
			});

			it('does not call getForwardingStatus when the forwarding-address ref is missing', async () => {
				getTransfersMock.mockResolvedValueOnce([]);

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [{ ...evmToIcpPendingTx, external_refs: [] }]
				});

				expect(getForwardingStatusMock).not.toHaveBeenCalled();
			});

			it('does not call getForwardingStatus when a TRANSFER_ID ref is already present', async () => {
				getTransferMock.mockResolvedValueOnce({
					source: { chain: 'Ethereum', amount: sourceAmount },
					destination: { chain: 'ICP', amount: sourceAmount },
					status: { PendingDestinationTx: null }
				});
				vi.spyOn(
					activeUserTransactionsServices,
					'applyActiveUserTransactionPollUpdate'
				).mockResolvedValue();

				await pollOneSecActiveUserTransactions({
					identity: mockIdentity,
					transactions: [
						{
							...evmToIcpPendingTx,
							external_refs: [
								...evmToIcpPendingTx.external_refs,
								{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '7' }
							]
						}
					]
				});

				expect(getForwardingStatusMock).not.toHaveBeenCalled();
				expect(getTransferMock).toHaveBeenCalledExactlyOnceWith({ id: 7n });
			});

			it('swallows getForwardingStatus SDK errors so the next tick can retry', async () => {
				getForwardingStatusMock.mockRejectedValueOnce(new Error('canister unreachable'));
				getTransfersMock.mockResolvedValueOnce([]);

				await expect(
					pollOneSecActiveUserTransactions({
						identity: mockIdentity,
						transactions: [evmToIcpPendingTx]
					})
				).resolves.toBeUndefined();
			});
		});
	});
});
