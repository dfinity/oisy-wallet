import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { estimatePriorityFee, getAccountInfo, getSolCreateAccountFee } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS,
	STAKE_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import * as solSendServices from '$sol/services/sol-send.services';
import { sendSignedTransaction } from '$sol/services/sol-send.services';
import * as solSignServices from '$sol/services/sol-sign.services';
import { signTransaction as executeSign } from '$sol/services/sol-sign.services';
import { simulateSolTransaction } from '$sol/services/sol-simulation.services';
import { decode, decodeMessage, sign, signMessage } from '$sol/services/wallet-connect.services';
import { solProgramNameStore } from '$sol/stores/sol-program-name.store';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import type { MappedSolTransaction, SolTransferParties } from '$sol/types/sol-transaction';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import * as solInstructionSummaryUtils from '$sol/utils/sol-instruction-summary.utils';
import * as solSignUtils from '$sol/utils/sol-sign.utils';
import { signTransaction } from '$sol/utils/sol-sign.utils';
import * as solTransactionsUtils from '$sol/utils/sol-transactions.utils';
import {
	decodeTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import {
	createMockSolCompiledTransactionMessageBytes,
	mockSolSignedTransaction
} from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import type { SignatureBytes } from '@solana/keys';
import {
	getBase58Decoder,
	getBase58Encoder,
	isTransactionMessageWithBlockhashLifetime,
	lamports,
	type Rpc,
	type SolanaRpcApi
} from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock(import('@solana/kit'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		isTransactionMessageWithBlockhashLifetime:
			vi.fn() as unknown as typeof isTransactionMessageWithBlockhashLifetime
	};
});

vi.mock(import('$sol/utils/sol-transactions.utils'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		mapSolTransactionMessage: vi.fn()
	};
});

vi.mock('$sol/providers/sol-rpc.providers', () => ({
	solanaHttpRpc: vi.fn(),
	solanaWebSocketRpc: vi.fn()
}));

vi.mock('$sol/api/solana.api', () => ({
	getAccountInfo: vi.fn(),
	estimatePriorityFee: vi.fn(),
	getMultipleAccountsInfo: vi.fn(),
	getSolCreateAccountFee: vi.fn(),
	simulateTransactionAccounts: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$sol/services/sol-simulation.services', () => ({
	simulateSolTransaction: vi.fn()
}));

describe('wallet-connect.services', () => {
	const mockParsedTransaction = { mock: 'mockParsedTransaction', instructions: [] };
	const mockMappedTransaction: MappedSolTransaction = {
		amount: 123n,
		destination: mockAtaAddress
	};
	const mockTransactionMessage = { mock: 'mockTransactionMessage' };
	// What mainnet charged a token account to exist on 2026-10-06.
	const mockRentExemptMinimum = lamports(1_488_440n);

	// Without a simulation the lists come from the message's own instructions and say so. The mock
	// message states none, so both are empty and the partial marker is the whole answer.
	const emptyPartialParties: SolTransferParties = {
		sources: [],
		destinations: [],
		partial: true
	};

	const mockSignature = mockSolSignature();
	const mockSignatureBytes: SignatureBytes = getBase58Encoder().encode(
		mockSignature
	) as SignatureBytes;

	const mockRpc = {
		sendTransaction: vi.fn(() => ({
			send: vi.fn(() => Promise.resolve({}))
		})),
		simulateTransaction: vi.fn(() => ({
			send: vi.fn(() => Promise.resolve({ value: {} }))
		}))
	} as unknown as Rpc<SolanaRpcApi>;

	let spyToastsShow: MockInstance;
	let spyToastsError: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);

		vi.spyOn(solTransactionsUtils, 'parseSolBase64TransactionMessage').mockResolvedValue(
			mockParsedTransaction as unknown as CompilableTransactionMessage
		);
		vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockImplementation(
			() => mockMappedTransaction
		);
		vi.spyOn(solTransactionsUtils, 'decodeTransactionMessage').mockImplementation(
			() => mockSolSignedTransaction
		);

		vi.mocked(getAccountInfo).mockResolvedValue({
			value: null
		} as unknown as Awaited<ReturnType<typeof getAccountInfo>>);

		vi.mocked(getSolCreateAccountFee).mockResolvedValue(mockRentExemptMinimum);

		vi.mocked(isTransactionMessageWithBlockhashLifetime).mockReturnValue(true);

		vi.spyOn(solSendServices, 'setLifetimeAndFeePayerToTransaction').mockResolvedValue(
			mockTransactionMessage as unknown as SolTransactionMessage
		);

		vi.spyOn(solSignServices, 'signTransaction').mockResolvedValue({
			signedTransaction: mockSolSignedTransaction,
			signature: mockSignature
		});

		vi.spyOn(solSendServices, 'sendSignedTransaction').mockImplementation(vi.fn());

		vi.spyOn(solSignUtils, 'signTransaction').mockResolvedValue({
			[mockSolAddress]: mockSignatureBytes
		});

		spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
		spyToastsError = vi.spyOn(toastsStore, 'toastsError');
	});

	describe('decode', () => {
		it('should throw an error if the networkId is invalid', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = ICP_NETWORK_ID;

			await expect(
				decode({ base64EncodedTransactionMessage, networkId, address: mockSolAddress })
			).rejects.toThrow(`No Solana network for network ${networkId.description}`);
		});

		it('should parse and map a transaction successfully for a valid network', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			const result = await decode({
				base64EncodedTransactionMessage,
				networkId,
				address: mockSolAddress
			});

			expect(parseSolBase64TransactionMessage).toHaveBeenCalledWith({
				transactionMessage: base64EncodedTransactionMessage,
				rpc: expect.anything()
			});
			expect(mapSolTransactionMessage).toHaveBeenCalledWith({
				transactionMessage: mockParsedTransaction,
				userAddress: mockSolAddress,
				rentExemptMinimum: mockRentExemptMinimum
			});
			expect(result).toEqual({
				...mockMappedTransaction,
				rentExemptMinimum: mockRentExemptMinimum,
				parties: emptyPartialParties
			});
		});

		it('should recover the SPL mint from the token account when the mapper did not surface it', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
				amount: 123n,
				source: mockAtaAddress,
				destination: mockSolAddress2
			});

			vi.mocked(getAccountInfo).mockResolvedValue({
				value: { data: { parsed: { info: { mint: mockSplAddress } } } }
			} as unknown as Awaited<ReturnType<typeof getAccountInfo>>);

			const result = await decode({
				base64EncodedTransactionMessage,
				networkId,
				address: mockSolAddress
			});

			expect(getAccountInfo).toHaveBeenCalledWith(
				expect.objectContaining({ address: mockAtaAddress })
			);
			expect(result).toEqual({
				amount: 123n,
				source: mockAtaAddress,
				destination: mockSolAddress2,
				tokenAddress: mockSplAddress,
				rentExemptMinimum: mockRentExemptMinimum,
				parties: emptyPartialParties
			});
		});

		it('should not recover a tokenAddress for a native SOL transfer to a token account', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			// Native SOL transfer: the source is the sender wallet (a non-parsed system
			// account), while the destination happens to be a token account (which would
			// carry a `mint`). Only the source must be consulted.
			vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
				amount: 5n,
				source: mockSolAddress,
				destination: mockAtaAddress
			});

			vi.mocked(getAccountInfo).mockResolvedValue({
				value: { data: ['', 'base64'] }
			} as unknown as Awaited<ReturnType<typeof getAccountInfo>>);

			const result = await decode({
				base64EncodedTransactionMessage,
				networkId,
				address: mockSolAddress
			});

			expect(getAccountInfo).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: mockSolAddress })
			);
			expect(result).toEqual({
				amount: 5n,
				source: mockSolAddress,
				destination: mockAtaAddress,
				rentExemptMinimum: mockRentExemptMinimum,
				parties: emptyPartialParties
			});
		});

		it('should fall back to native SOL when the token account lookup throws', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
				amount: 7n,
				source: mockAtaAddress,
				destination: mockSolAddress2
			});

			vi.mocked(getAccountInfo).mockRejectedValue(new Error('RPC down'));

			const result = await decode({
				base64EncodedTransactionMessage,
				networkId,
				address: mockSolAddress
			});

			expect(result).toEqual({
				amount: 7n,
				source: mockAtaAddress,
				destination: mockSolAddress2,
				rentExemptMinimum: mockRentExemptMinimum,
				parties: emptyPartialParties
			});
		});

		// Every account creation in the message is held to what the chain charges a token account to
		// exist: funded above it, a creation is a payment rather than rent, and is refused.
		describe('the rent reserve', () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			afterEach(() => {
				vi.useRealTimers();
			});

			it('should hold the message to the reserve the chain charges and hand it on', async () => {
				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(getSolCreateAccountFee).toHaveBeenCalledExactlyOnceWith('mainnet');
				expect(mapSolTransactionMessage).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ rentExemptMinimum: mockRentExemptMinimum })
				);
				expect(simulateSolTransaction).toHaveBeenCalledOnce();

				const [[{ rentExemptMinimumRequest }]] = vi.mocked(simulateSolTransaction).mock.calls;

				await expect(rentExemptMinimumRequest).resolves.toBe(mockRentExemptMinimum);

				expect(result).toEqual(
					expect.objectContaining({ rentExemptMinimum: mockRentExemptMinimum })
				);
			});

			// Without it a creation for a program has no line to be held to, which the mapper refuses,
			// so the review holds the button rather than offering what signing would refuse.
			it('should decode without a reserve when the chain does not answer', async () => {
				vi.mocked(getSolCreateAccountFee).mockRejectedValueOnce(new Error('RPC down'));

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(mapSolTransactionMessage).toHaveBeenCalledExactlyOnceWith({
					transactionMessage: mockParsedTransaction,
					userAddress: mockSolAddress,
					rentExemptMinimum: undefined
				});
				expect(simulateSolTransaction).toHaveBeenCalledOnce();

				const [[{ rentExemptMinimumRequest }]] = vi.mocked(simulateSolTransaction).mock.calls;

				await expect(rentExemptMinimumRequest).resolves.toBeUndefined();

				expect(result).not.toHaveProperty('rentExemptMinimum');
			});

			// An RPC that never answers is given up on after the simulation's timeout, so it cannot leave
			// the review unapprovable.
			it('should decode without a reserve when the chain does not answer in time', async () => {
				vi.useFakeTimers();

				vi.mocked(getSolCreateAccountFee).mockReturnValueOnce(new Promise(() => undefined));

				const pending = decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				await vi.advanceTimersByTimeAsync(SOLANA_SIMULATION_TIMEOUT_MILLISECONDS);

				const result = await pending;

				expect(mapSolTransactionMessage).toHaveBeenCalledExactlyOnceWith({
					transactionMessage: mockParsedTransaction,
					userAddress: mockSolAddress,
					rentExemptMinimum: undefined
				});
				expect(result).not.toHaveProperty('rentExemptMinimum');
			});

			// The run waits for the reserve inside its own timeout, so a stalled reserve and a stalled
			// run cost one timeout rather than two in a row.
			it('should start the simulation before the reserve arrives', async () => {
				vi.useFakeTimers();

				vi.mocked(getSolCreateAccountFee).mockReturnValueOnce(new Promise(() => undefined));

				const pending = decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				await vi.advanceTimersByTimeAsync(0);

				expect(simulateSolTransaction).toHaveBeenCalledOnce();
				expect(mapSolTransactionMessage).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(SOLANA_SIMULATION_TIMEOUT_MILLISECONDS);

				await pending;

				expect(mapSolTransactionMessage).toHaveBeenCalledOnce();
			});
		});

		describe('simulated preview', () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			const mockPreview: SolSimulationPreview = {
				solDelta: -5_000n,
				tokenDeltas: [],
				controlChanges: []
			};

			const mockParties: SolTransferParties = {
				sources: [{ address: mockSolAddress, own: true }],
				destinations: [{ address: mockSolAddress2, own: false }],
				partial: false
			};

			it('should attach the preview to the decoded review', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue({
					preview: mockPreview,
					parties: mockParties,
					unreadPrograms: []
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(simulateSolTransaction).toHaveBeenCalledExactlyOnceWith({
					base64EncodedTransactionMessage,
					transactionMessage: mockParsedTransaction,
					address: mockSolAddress,
					network: 'mainnet',
					rentExemptMinimumRequest: expect.any(Promise)
				});
				expect(result).toEqual(expect.objectContaining({ preview: mockPreview }));
			});

			it('should pass on that the run opens an account above its rent', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue({
					parties: mockParties,
					unreadPrograms: [],
					opensAccountBeyondRent: true
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual(expect.objectContaining({ opensAccountBeyondRent: true }));
			});

			it('should decode without a preview when the simulation yields none', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue({
					parties: mockParties,
					unreadPrograms: []
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual({
					...mockMappedTransaction,
					rentExemptMinimum: mockRentExemptMinimum,
					parties: mockParties,
					unreadPrograms: []
				});
				expect(result).not.toHaveProperty('preview');
			});
		});

		// The Operations tab lists what the message contains. A run reveals the calls made inside
		// other programs; without one the message's own instructions are still worth listing, and
		// the review has to say which of the two it got.
		describe('the instruction list', () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			const mockParties: SolTransferParties = {
				sources: [{ address: mockSolAddress, own: true }],
				destinations: [{ address: mockSolAddress2, own: false }],
				partial: false
			};

			const simulated: SolInstructionSummary[] = [
				{ kind: 'send', amount: 1_000_000n, counterparty: mockSolAddress2 }
			];

			it('should call the list simulated when the run produced one', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue({
					instructions: simulated,
					parties: mockParties,
					unreadPrograms: []
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual(
					expect.objectContaining({ instructions: simulated, simulatedInstructions: true })
				);
			});

			// A run reports its parties whether or not it produced any instruction summaries, so
			// this is the state where only the list falls back.
			it('should read the message when the run produced no list', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue({
					parties: mockParties,
					unreadPrograms: []
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).not.toHaveProperty('simulatedInstructions');
				expect(result).toEqual({
					...mockMappedTransaction,
					rentExemptMinimum: mockRentExemptMinimum,
					parties: mockParties,
					unreadPrograms: []
				});
			});

			// Read from the message, the list states the rent of what the message opens and of what it
			// closes against the same reserve a run's list is given.
			it('should hand the reserve to the list read from the message', async () => {
				const spyMapSolInstructionSummaries = vi.spyOn(
					solInstructionSummaryUtils,
					'mapSolInstructionSummaries'
				);

				vi.mocked(simulateSolTransaction).mockResolvedValue({
					parties: mockParties,
					unreadPrograms: []
				});

				await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(spyMapSolInstructionSummaries).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ rentExemptMinimum: mockRentExemptMinimum })
				);
			});

			// An empty list is the run's answer that there is nothing to list. Rebuilt from the
			// message, which cannot see that an account is already there, it listed a creation the
			// run found did nothing.
			it('should pass on an empty list from the run rather than read the message', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue({
					instructions: [],
					parties: mockParties,
					unreadPrograms: []
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual(
					expect.objectContaining({ instructions: [], simulatedInstructions: true })
				);
			});
		});

		describe('transfer parties', () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			it('should take the lists the simulation derived, whole', async () => {
				const parties: SolTransferParties = {
					sources: [{ address: mockAtaAddress, owner: mockSolAddress, own: true }],
					destinations: [{ address: mockSolAddress2, own: false }],
					partial: false
				};

				vi.mocked(simulateSolTransaction).mockResolvedValue({ parties, unreadPrograms: [] });

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual(expect.objectContaining({ parties }));
			});

			it('should mark the lists partial when there is no simulation to build them from', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue(undefined);

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual(expect.objectContaining({ parties: emptyPartialParties }));
			});

			describe('unread programs', () => {
				const parties: SolTransferParties = { sources: [], destinations: [], partial: false };

				// Named from the store so nothing is read from the chain: the stake program publishes
				// no interface, the other one does.
				beforeEach(() => {
					solProgramNameStore.set({
						network: 'mainnet',
						names: { [STAKE_PROGRAM_ADDRESS]: '', [mockSolAddress3]: 'lending_app' }
					});
				});

				afterEach(() => {
					solProgramNameStore.reset();
				});

				it('should pass on the programs the run calls that it does not know, with their names', async () => {
					vi.mocked(simulateSolTransaction).mockResolvedValue({
						parties,
						unreadPrograms: [STAKE_PROGRAM_ADDRESS, mockSolAddress3]
					});

					const result = await decode({
						base64EncodedTransactionMessage,
						networkId,
						address: mockSolAddress
					});

					expect(result.unreadPrograms).toEqual([
						{ address: STAKE_PROGRAM_ADDRESS },
						{ address: mockSolAddress3, name: 'lending_app' }
					]);
				});

				it('should pass on none when the run calls only programs it knows', async () => {
					vi.mocked(simulateSolTransaction).mockResolvedValue({
						parties,
						unreadPrograms: []
					});

					const result = await decode({
						base64EncodedTransactionMessage,
						networkId,
						address: mockSolAddress
					});

					expect(result.unreadPrograms).toEqual([]);
				});

				it('should leave them out without a run to name them from', async () => {
					vi.mocked(simulateSolTransaction).mockResolvedValue(undefined);

					const result = await decode({
						base64EncodedTransactionMessage,
						networkId,
						address: mockSolAddress
					});

					expect(result).not.toHaveProperty('unreadPrograms');
				});
			});
		});

		describe('prioritization fee estimate', () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			beforeEach(() => {
				vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
					amount: 123n,
					source: mockSolAddress,
					destination: mockSolAddress2,
					prioritizationFee: 1_000_000_001n,
					computeUnitLimit: 1_400_000n
				});
			});

			it('should price the network estimate over the compute unit limit of this transaction', async () => {
				// the RPC quotes micro-lamports per compute unit, so 800_000 over 1_400_000 units is
				// 1_120_000 lamports, not 800_000
				vi.mocked(estimatePriorityFee).mockResolvedValue(800_000n);

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(estimatePriorityFee).toHaveBeenCalledExactlyOnceWith({ network: 'mainnet' });
				expect(result).toEqual(expect.objectContaining({ prioritizationFeeEstimate: 1_120_000n }));
			});

			it('should omit the estimate when the RPC fails, without failing the decode', async () => {
				vi.mocked(estimatePriorityFee).mockRejectedValue(new Error('RPC down'));

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(result).toEqual(
					expect.objectContaining({ amount: 123n, prioritizationFee: 1_000_000_001n })
				);
				expect(result).not.toHaveProperty('prioritizationFeeEstimate');
			});

			it('should not query the network when the transaction requests no prioritization', async () => {
				vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
					amount: 123n,
					source: mockSolAddress,
					destination: mockSolAddress2
				});

				const result = await decode({
					base64EncodedTransactionMessage,
					networkId,
					address: mockSolAddress
				});

				expect(estimatePriorityFee).not.toHaveBeenCalled();
				expect(result).not.toHaveProperty('prioritizationFeeEstimate');
			});
		});
	});

	describe('sign', () => {
		const mockListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			attachHandlers: vi.fn(),
			detachHandlers: vi.fn(),
			rejectRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
			disconnectSession: vi.fn(),
			disconnect: vi.fn()
		} as WalletConnectListener;
		const mockTransaction = { mock: 'mock-transaction' };
		const mockRequest = {
			params: {
				request: {
					method: SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
					params: { transaction: mockTransaction }
				}
			}
		} as WalletKitTypes.SessionRequest;
		const mockParams = {
			address: mockSolAddress,
			modalNext: vi.fn(),
			token: SOLANA_TOKEN,
			progress: vi.fn(),
			identity: mockIdentity,
			request: mockRequest,
			listener: mockListener,
			simulated: true,
			closesPayOthers: false,
			unreadProgramsAcknowledged: true,
			rentExemptMinimum: mockRentExemptMinimum,
			opensAccountBeyondRent: false,
			reassignsWallet: false
		};

		describe(`with method ${SESSION_REQUEST_SOL_SIGN_TRANSACTION}`, () => {
			const mockRequest = {
				params: {
					request: {
						method: SESSION_REQUEST_SOL_SIGN_TRANSACTION,
						params: { transaction: mockTransaction }
					}
				}
			} as WalletKitTypes.SessionRequest;
			const mockParams = {
				address: mockSolAddress,
				modalNext: vi.fn(),
				token: SOLANA_TOKEN,
				progress: vi.fn(),
				identity: mockIdentity,
				request: mockRequest,
				listener: mockListener,
				simulated: true,
				closesPayOthers: false,
				unreadProgramsAcknowledged: true,
				rentExemptMinimum: mockRentExemptMinimum,
				opensAccountBeyondRent: false,
				reassignsWallet: false
			};

			const expected = {
				identity: mockIdentity,
				address: mockSolAddress,
				network: 'mainnet',
				transaction: mockSolSignedTransaction
			};

			it('should show an error if the address is nullish', async () => {
				const result = await sign({ ...mockParams, address: null });

				expect(result).toEqual({ success: false });

				expect(executeSign).not.toHaveBeenCalled();

				expect(sendSignedTransaction).not.toHaveBeenCalled();

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.wallet_not_initialized }
				});
			});

			it('should return success with amount and destination when signing is successful', async () => {
				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: true });

				expect(parseSolBase64TransactionMessage).toHaveBeenCalledExactlyOnceWith({
					transactionMessage: mockTransaction,
					rpc: expect.any(Object)
				});

				expect(mapSolTransactionMessage).toHaveBeenCalledExactlyOnceWith({
					transactionMessage: mockParsedTransaction,
					userAddress: mockSolAddress,
					rentExemptMinimum: mockRentExemptMinimum
				});

				// Signing holds the message to the reserve the review was computed with rather than
				// asking the chain again.
				expect(getSolCreateAccountFee).not.toHaveBeenCalled();

				expect(decodeTransactionMessage).toHaveBeenCalledExactlyOnceWith(mockTransaction);

				expect(signTransaction).toHaveBeenCalledExactlyOnceWith(expected);

				expect(executeSign).not.toHaveBeenCalled();

				expect(sendSignedTransaction).not.toHaveBeenCalled();

				expect(mockParams.modalNext).toHaveBeenCalledOnce();

				expect(mockParams.progress).toHaveBeenCalledTimes(3);
				expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSendSol.SIGN);
				expect(mockParams.progress).toHaveBeenNthCalledWith(
					2,
					ProgressStepsSign.APPROVE_WALLET_CONNECT
				);
				expect(mockParams.progress).toHaveBeenNthCalledWith(3, ProgressStepsSendSol.DONE);

				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					message: { signature: mockSignature }
				});

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(en.wallet_connect.info.transaction_executed, {
						$method: mockParams.request.params.request.method
					}),
					level: 'info',
					duration: 2000
				});
				expect(spyToastsError).not.toHaveBeenCalled();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: SOLANA_TOKEN.symbol
					}
				});

				expect(console.warn).not.toHaveBeenCalled();
			});

			it('should handle errors when signing', async () => {
				const mockError = new Error('mock-sign-error');

				vi.spyOn(solSignUtils, 'signTransaction').mockRejectedValueOnce(mockError);

				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: false, err: mockError });

				expect(signTransaction).toHaveBeenCalledExactlyOnceWith(expected);

				expect(mockParams.modalNext).toHaveBeenCalledOnce();

				expect(mockParams.progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSendSol.SIGN);

				expect(mockListener.approveRequest).not.toHaveBeenCalled();
				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});

				expect(spyToastsShow).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.wallet_connect.error.unexpected_processing_request },
					err: mockError
				});

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
					metadata: {
						token: SOLANA_TOKEN.symbol
					}
				});

				expect(console.warn).not.toHaveBeenCalled();
			});
		});

		describe(`with method ${SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION}`, () => {
			const mockRequest = {
				params: {
					request: {
						method: SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
						params: { transaction: mockTransaction }
					}
				}
			} as WalletKitTypes.SessionRequest;
			const mockParams = {
				address: mockSolAddress,
				modalNext: vi.fn(),
				token: SOLANA_TOKEN,
				progress: vi.fn(),
				identity: mockIdentity,
				request: mockRequest,
				listener: mockListener,
				simulated: true,
				closesPayOthers: false,
				unreadProgramsAcknowledged: true,
				rentExemptMinimum: mockRentExemptMinimum,
				opensAccountBeyondRent: false,
				reassignsWallet: false
			};

			it('should show an error if the address is nullish', async () => {
				const result = await sign({ ...mockParams, address: null });

				expect(result).toEqual({ success: false });

				expect(executeSign).not.toHaveBeenCalled();

				expect(sendSignedTransaction).not.toHaveBeenCalled();

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.wallet_not_initialized }
				});
			});

			it('should return success with amount and destination when signing is successful', async () => {
				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: true });

				expect(parseSolBase64TransactionMessage).toHaveBeenCalledTimes(2);
				expect(parseSolBase64TransactionMessage).toHaveBeenNthCalledWith(1, {
					transactionMessage: mockTransaction,
					rpc: expect.any(Object)
				});
				expect(parseSolBase64TransactionMessage).toHaveBeenNthCalledWith(2, {
					transactionMessage: mockTransaction,
					rpc: expect.any(Object)
				});

				expect(mapSolTransactionMessage).toHaveBeenCalledExactlyOnceWith({
					transactionMessage: mockParsedTransaction,
					userAddress: mockSolAddress,
					rentExemptMinimum: mockRentExemptMinimum
				});

				expect(decodeTransactionMessage).toHaveBeenCalledExactlyOnceWith(mockTransaction);

				expect(executeSign).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).toHaveBeenCalledExactlyOnceWith({
					signedTransaction: mockSolSignedTransaction,
					rpc: expect.any(Object)
				});

				expect(mockParams.modalNext).toHaveBeenCalledOnce();

				expect(mockParams.progress).toHaveBeenCalledTimes(4);
				expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSendSol.SIGN);
				expect(mockParams.progress).toHaveBeenNthCalledWith(2, ProgressStepsSendSol.SEND);
				expect(mockParams.progress).toHaveBeenNthCalledWith(
					3,
					ProgressStepsSign.APPROVE_WALLET_CONNECT
				);
				expect(mockParams.progress).toHaveBeenNthCalledWith(4, ProgressStepsSendSol.DONE);

				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					message: { signature: mockSignature }
				});

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(en.wallet_connect.info.transaction_executed, {
						$method: mockParams.request.params.request.method
					}),
					level: 'info',
					duration: 2000
				});
				expect(spyToastsError).not.toHaveBeenCalled();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: SOLANA_TOKEN.symbol
					}
				});

				expect(console.warn).not.toHaveBeenCalled();
			});

			it('should handle errors when signing', async () => {
				const mockError = new Error('mock-sign-error');

				vi.spyOn(solSignServices, 'signTransaction').mockRejectedValueOnce(mockError);

				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: false, err: mockError });

				expect(executeSign).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).not.toHaveBeenCalled();

				expect(mockParams.modalNext).toHaveBeenCalledOnce();

				expect(mockParams.progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSendSol.SIGN);

				expect(mockListener.approveRequest).not.toHaveBeenCalled();
				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});

				expect(spyToastsShow).not.toHaveBeenCalled();
				expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.wallet_connect.error.unexpected_processing_request },
					err: mockError
				});

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
					metadata: {
						token: SOLANA_TOKEN.symbol
					}
				});

				expect(console.warn).not.toHaveBeenCalled();
			});

			it('should log simulation errors but continue execution', async () => {
				const mockError = new Error('mock-simulation-error');
				const mockSimulationResult = { value: { err: mockError } };

				vi.spyOn(mockRpc, 'simulateTransaction').mockReturnValueOnce({
					send: vi.fn(() => Promise.resolve(mockSimulationResult))
				} as unknown as ReturnType<typeof mockRpc.simulateTransaction>);

				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: true });

				expect(executeSign).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).toHaveBeenCalledExactlyOnceWith({
					signedTransaction: mockSolSignedTransaction,
					rpc: expect.any(Object)
				});

				expect(mockParams.modalNext).toHaveBeenCalledOnce();

				expect(mockParams.progress).toHaveBeenCalledTimes(4);
				expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSendSol.SIGN);
				expect(mockParams.progress).toHaveBeenNthCalledWith(2, ProgressStepsSendSol.SEND);
				expect(mockParams.progress).toHaveBeenNthCalledWith(
					3,
					ProgressStepsSign.APPROVE_WALLET_CONNECT
				);
				expect(mockParams.progress).toHaveBeenNthCalledWith(4, ProgressStepsSendSol.DONE);

				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					message: { signature: mockSignature }
				});

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(en.wallet_connect.info.transaction_executed, {
						$method: mockParams.request.params.request.method
					}),
					level: 'info',
					duration: 2000
				});
				expect(spyToastsError).not.toHaveBeenCalled();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: SOLANA_TOKEN.symbol
					}
				});

				expect(console.warn).toHaveBeenCalledExactlyOnceWith(
					'WalletConnect Solana transaction simulation error',
					mockSimulationResult
				);
			});

			it('should wait for sending to be confirmed', async () => {
				const spy = vi.spyOn(solSendServices, 'sendSignedTransaction');

				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: true });

				expect(executeSign).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).toHaveBeenCalledExactlyOnceWith({
					signedTransaction: mockSolSignedTransaction,
					rpc: expect.any(Object)
				});

				expect(mockParams.progress).toHaveBeenCalledTimes(4);
				expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSendSol.SIGN);
				expect(mockParams.progress).toHaveBeenNthCalledWith(2, ProgressStepsSendSol.SEND);
				expect(mockParams.progress).toHaveBeenNthCalledWith(
					3,
					ProgressStepsSign.APPROVE_WALLET_CONNECT
				);
				expect(mockParams.progress).toHaveBeenNthCalledWith(4, ProgressStepsSendSol.DONE);

				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					message: { signature: mockSignature }
				});

				expect(mockListener.approveRequest).toHaveBeenCalledAfter(spy);

				expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
					text: replacePlaceholders(en.wallet_connect.info.transaction_executed, {
						$method: mockParams.request.params.request.method
					}),
					level: 'info',
					duration: 2000
				});

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: SOLANA_TOKEN.symbol
					}
				});
			});

			it('should raise errors when sending', async () => {
				const mockError = new Error('mock-send-error');

				vi.spyOn(solSendServices, 'sendSignedTransaction').mockImplementationOnce(() => {
					throw mockError;
				});

				const result = await sign(mockParams);

				expect(result).toStrictEqual({ success: false, err: mockError });

				expect(executeSign).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).toHaveBeenCalledExactlyOnceWith({
					signedTransaction: mockSolSignedTransaction,
					rpc: expect.any(Object)
				});

				expect(mockParams.progress).toHaveBeenCalledTimes(2);
				expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSendSol.SIGN);
				expect(mockParams.progress).toHaveBeenNthCalledWith(2, ProgressStepsSendSol.SEND);

				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(console.warn).not.toHaveBeenCalled();
			});
		});

		describe('with other WalletConnect methods', () => {
			const mockParamsOther = {
				...mockParams,
				request: {
					...mockRequest,
					params: {
						...mockRequest.params,
						request: {
							...mockRequest.params.request,
							method: 'mock-method'
						}
					}
				}
			};

			it('should not sign the transactions', async () => {
				const result = await sign(mockParamsOther);

				expect(result).toEqual({ success: false });

				expect(executeSign).not.toHaveBeenCalled();

				expect(sendSignedTransaction).not.toHaveBeenCalled();

				expect(mockParams.progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSendSol.SIGN);

				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).not.toHaveBeenCalled();

				expect(spyToastsShow).not.toHaveBeenCalled();
				expect(spyToastsError).not.toHaveBeenCalled();

				expect(trackEvent).not.toHaveBeenCalled();

				expect(console.warn).not.toHaveBeenCalled();
			});
		});

		describe('with an unreviewed transaction', () => {
			beforeEach(() => {
				vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
					...mockMappedTransaction,
					unreviewed: true
				});
			});

			it('should refuse to sign when no simulation described it', async () => {
				const result = await sign({ ...mockParams, simulated: false });

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.unreviewed_without_simulation }
				});

				expect(mockParams.modalNext).not.toHaveBeenCalled();
				expect(executeSign).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});
			});

			it('should sign when a simulation described it', async () => {
				// The warning exists because the simulated run reports the effect no decoder read. With
				// one in hand the review is incomplete, not silent, and the user decides.
				const result = await sign({ ...mockParams, simulated: true });

				expect(result).toEqual(expect.objectContaining({ success: true }));

				expect(spyToastsError).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).toHaveBeenCalledOnce();
			});
		});

		describe('with a close that pays somebody else', () => {
			it('should refuse to sign', async () => {
				const result = await sign({ ...mockParams, closesPayOthers: true });

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.close_pays_others }
				});

				expect(mockParams.modalNext).not.toHaveBeenCalled();
				expect(executeSign).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});
			});

			// The mapper raises ambiguous for a close the message states, so both are true of the
			// commonest case and the general sentence would be given for the specific thing that is
			// wrong with it. The review's notices are ordered the same way.
			it('should say which refusal it is when the message states the close itself', async () => {
				vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
					...mockMappedTransaction,
					ambiguous: true
				});

				const result = await sign({ ...mockParams, closesPayOthers: true });

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.close_pays_others }
				});

				expect(spyToastsError).not.toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.ambiguous_transaction }
				});
			});

			// The close every routed swap ends in names the user's own wallet, and refusing those
			// would refuse the swap.
			it('should sign when every close pays the user', async () => {
				const result = await sign({ ...mockParams, closesPayOthers: false });

				expect(result).toEqual(expect.objectContaining({ success: true }));

				expect(spyToastsError).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).toHaveBeenCalledOnce();
			});
		});

		describe('with a program the run calls that OISY does not know', () => {
			it('should refuse to sign when the review did not confirm it', async () => {
				const result = await sign({ ...mockParams, unreadProgramsAcknowledged: false });

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.unread_programs_unconfirmed }
				});

				expect(mockParams.modalNext).not.toHaveBeenCalled();
				expect(executeSign).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});
			});

			it('should sign once the review confirmed it', async () => {
				const result = await sign({ ...mockParams, unreadProgramsAcknowledged: true });

				expect(result).toEqual(expect.objectContaining({ success: true }));

				expect(spyToastsError).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).toHaveBeenCalledOnce();
			});
		});

		describe('with a transaction OISY read in full', () => {
			it('should sign even when no simulation was obtained', async () => {
				// The simulation stays best effort for a message the wallet understands: a provider that
				// times out must not refuse a transaction the review already describes.
				const result = await sign({ ...mockParams, simulated: false });

				expect(result).toEqual(expect.objectContaining({ success: true }));

				expect(spyToastsError).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).toHaveBeenCalledOnce();
			});
		});

		// Only the run shows an account a program opens inside its own instruction, so the decode's
		// verdict on it is handed in rather than read from the message.
		describe('with an account opened above its rent inside an instruction', () => {
			it('should refuse to sign and reject the request', async () => {
				const result = await sign({ ...mockParams, opensAccountBeyondRent: true });

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.ambiguous_transaction }
				});

				expect(executeSign).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});
			});
		});

		// A program can hand the wallet to another program inside its own call, which only the run
		// shows, so the review's verdict on it is handed in rather than read from the message.
		describe('with the wallet handed to another program inside an instruction', () => {
			it('should refuse to sign and reject the request', async () => {
				const result = await sign({ ...mockParams, reassignsWallet: true });

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.ambiguous_transaction }
				});

				expect(mockParams.modalNext).not.toHaveBeenCalled();
				expect(executeSign).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});
			});
		});

		describe('with an ambiguous transaction', () => {
			beforeEach(() => {
				vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockReturnValue({
					...mockMappedTransaction,
					ambiguous: true
				});
			});

			it('should refuse to sign and reject the request', async () => {
				const result = await sign(mockParams);

				expect(result).toEqual({ success: false });

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.wallet_connect.error.ambiguous_transaction }
				});

				expect(mockParams.modalNext).not.toHaveBeenCalled();
				expect(executeSign).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(mockListener.approveRequest).not.toHaveBeenCalled();

				expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
					topic: mockRequest.topic,
					id: mockRequest.id,
					error: UNEXPECTED_ERROR
				});
			});
		});
	});

	describe('decodeMessage', () => {
		it('should decode a base58-encoded UTF-8 message to readable text', () => {
			const text = 'Sign in with Solana';
			const base58Message = getBase58Decoder().decode(new TextEncoder().encode(text));

			const request = {
				params: { request: { params: { message: base58Message } } }
			} as unknown as WalletKitTypes.SessionRequest;

			expect(decodeMessage(request)).toBe(text);
		});

		it('should return an empty string when the message is missing', () => {
			const request = {
				params: { request: { params: {} } }
			} as unknown as WalletKitTypes.SessionRequest;

			expect(decodeMessage(request)).toBe('');
		});

		it('should fall back to the raw value when the message is not valid base58', () => {
			const message = 'not valid base58 !!!';

			const request = {
				params: { request: { params: { message } } }
			} as unknown as WalletKitTypes.SessionRequest;

			expect(decodeMessage(request)).toBe(message);
		});
	});

	describe('signMessage', () => {
		const mockListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			attachHandlers: vi.fn(),
			detachHandlers: vi.fn(),
			rejectRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
			disconnectSession: vi.fn(),
			disconnect: vi.fn()
		} as unknown as WalletConnectListener;

		const messageText = 'Sign in with Solana';
		const base58Message = getBase58Decoder().decode(new TextEncoder().encode(messageText));

		const mockRequest = {
			id: 1,
			topic: 'mock-topic',
			params: {
				request: {
					method: SESSION_REQUEST_SOL_SIGN_MESSAGE,
					params: { message: base58Message, pubkey: mockSolAddress }
				}
			}
		} as unknown as WalletKitTypes.SessionRequest;

		const mockParams = {
			address: mockSolAddress,
			networkId: SOLANA_MAINNET_NETWORK_ID,
			modalNext: vi.fn(),
			progress: vi.fn(),
			identity: mockIdentity,
			request: mockRequest,
			listener: mockListener,
			simulated: true,
			closesPayOthers: false
		};

		const mockMessageSignatureBytes = Uint8Array.from([10, 20, 30]);

		beforeEach(() => {
			vi.spyOn(solSignUtils, 'signMessage').mockResolvedValue(mockMessageSignatureBytes);
		});

		it('should show an error and reject when the address is nullish', async () => {
			const result = await signMessage({ ...mockParams, address: null });

			expect(result).toEqual({ success: false });

			expect(solSignUtils.signMessage).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledOnce();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.wallet_not_initialized }
			});
		});

		it('should show an error and reject when the message is missing', async () => {
			const request = {
				id: 1,
				topic: 'mock-topic',
				params: {
					request: { method: SESSION_REQUEST_SOL_SIGN_MESSAGE, params: {} }
				}
			} as unknown as WalletKitTypes.SessionRequest;

			const result = await signMessage({ ...mockParams, request });

			expect(result).toEqual({ success: false });

			expect(solSignUtils.signMessage).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.unknown_parameter }
			});
		});

		it('should sign the decoded message and approve with a base58 signature', async () => {
			const result = await signMessage(mockParams);

			expect(result).toStrictEqual({ success: true });

			expect(solSignUtils.signMessage).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: 'mainnet',
				message: Uint8Array.from(getBase58Encoder().encode(base58Message))
			});

			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: mockRequest.id,
				topic: mockRequest.topic,
				message: { signature: getBase58Decoder().decode(mockMessageSignatureBytes) }
			});

			expect(mockParams.modalNext).toHaveBeenCalledOnce();

			expect(mockParams.progress).toHaveBeenCalledTimes(3);
			expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSign.SIGN);
			expect(mockParams.progress).toHaveBeenNthCalledWith(
				2,
				ProgressStepsSign.APPROVE_WALLET_CONNECT
			);
			expect(mockParams.progress).toHaveBeenNthCalledWith(3, ProgressStepsSign.DONE);

			expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.wallet_connect.info.sign_executed,
				level: 'info',
				duration: 2000
			});
			expect(spyToastsError).not.toHaveBeenCalled();
		});

		// A `signMessage` signature is taken over the raw bytes with the same key, derivation path and
		// no domain separator that the transaction flow signs a compiled transaction message with, so
		// a transaction smuggled through this method would come back as a usable transaction
		// signature obtained from a review that shows no amount, destination or fee.
		describe('with a serialized transaction message as the payload', () => {
			it.each(['legacy', 0] as const)(
				'should refuse to sign a version %s transaction message and reject the request',
				async (version) => {
					const request = {
						id: 1,
						topic: 'mock-topic',
						params: {
							request: {
								method: SESSION_REQUEST_SOL_SIGN_MESSAGE,
								params: {
									message: getBase58Decoder().decode(
										createMockSolCompiledTransactionMessageBytes(version)
									),
									pubkey: mockSolAddress
								}
							}
						}
					} as unknown as WalletKitTypes.SessionRequest;

					const result = await signMessage({ ...mockParams, request });

					expect(result).toEqual({ success: false });

					expect(solSignUtils.signMessage).not.toHaveBeenCalled();
					expect(mockListener.approveRequest).not.toHaveBeenCalled();
					expect(mockParams.modalNext).not.toHaveBeenCalled();

					expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
						topic: request.topic,
						id: request.id,
						error: UNEXPECTED_ERROR
					});

					expect(spyToastsError).toHaveBeenCalledWith({
						msg: { text: en.wallet_connect.error.sol_transaction_as_message }
					});
				}
			);
		});

		it('should reject over WalletConnect and surface the error when signing fails', async () => {
			const mockError = new Error('mock-sign-error');

			vi.spyOn(solSignUtils, 'signMessage').mockRejectedValueOnce(mockError);

			const result = await signMessage(mockParams);

			expect(result).toStrictEqual({ success: false, err: mockError });

			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: mockRequest.topic,
				id: mockRequest.id,
				error: UNEXPECTED_ERROR
			});
		});
	});
});
