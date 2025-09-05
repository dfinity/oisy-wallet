import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION } from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import * as solSendServices from '$sol/services/sol-send.services';
import { sendSignedTransaction } from '$sol/services/sol-send.services';
import * as solSignServices from '$sol/services/sol-sign.services';
import { signTransaction } from '$sol/services/sol-sign.services';
import { decode, sign } from '$sol/services/wallet-connect.services';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import * as solTransactionsUtils from '$sol/utils/sol-transactions.utils';
import {
	decodeTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolSignedTransaction } from '$tests/mocks/sol-transactions.mock';
import { mockAtaAddress, mockSolAddress } from '$tests/mocks/sol.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import {
	addSignersToTransactionMessage,
	type CompilableTransactionMessage,
	type Rpc,
	type SolanaRpcApi
} from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock(import('@solana/kit'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		addSignersToTransactionMessage: vi.fn()
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

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('wallet-connect.services', () => {
	const mockParsedTransaction = { mock: 'mockParsedTransaction' };
	const mockMappedTransaction: MappedSolTransaction = {
		amount: 123n,
		destination: mockAtaAddress
	};
	const mockAllSignersTransaction = { mock: 'mockAllSignersTransaction' };
	const mockTransactionMessage = { mock: 'mockTransactionMessage' };

	const mockSignature = mockSolSignature();

	const mockRpc = {
		sendTransaction: vi.fn(() => ({
			send: vi.fn(() => Promise.resolve({}))
		})),
		simulateTransaction: vi.fn(() => ({
			send: vi.fn(() => Promise.resolve({ value: {} }))
		}))
	} as unknown as Rpc<SolanaRpcApi>;

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
		vi.spyOn(solTransactionsUtils, 'transactionMessageHasBlockhashLifetime').mockReturnValue(true);

		vi.mocked(addSignersToTransactionMessage).mockReturnValue(
			mockAllSignersTransaction as unknown as ReturnType<typeof addSignersToTransactionMessage>
		);

		vi.spyOn(solSendServices, 'setLifetimeAndFeePayerToTransaction').mockResolvedValue(
			mockTransactionMessage as unknown as SolTransactionMessage
		);

		vi.spyOn(solSignServices, 'signTransaction').mockResolvedValue({
			signedTransaction: mockSolSignedTransaction,
			signature: mockSignature
		});

		vi.spyOn(solSendServices, 'sendSignedTransaction').mockImplementation(vi.fn());
	});

	describe('decode', () => {
		it('should throw an error if the networkId is invalid', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = ICP_NETWORK_ID;

			await expect(decode({ base64EncodedTransactionMessage, networkId })).rejects.toThrow(
				`No Solana network for network ${networkId.description}`
			);
		});

		it('should parse and map a transaction successfully for a valid network', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;

			const result = await decode({ base64EncodedTransactionMessage, networkId });

			expect(parseSolBase64TransactionMessage).toHaveBeenCalledWith({
				transactionMessage: base64EncodedTransactionMessage,
				rpc: expect.anything()
			});
			expect(mapSolTransactionMessage).toHaveBeenCalledWith(mockParsedTransaction);
			expect(result).toEqual(mockMappedTransaction);
		});
	});

	describe('sign', () => {
		const mockListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			sessionProposal: vi.fn(),
			rejectRequest: vi.fn(),
			sessionDelete: vi.fn(),
			sessionRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
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
			listener: mockListener
		};

		let spyToastsShow: MockInstance;
		let spyToastsError: MockInstance;

		beforeEach(() => {
			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		it('should show an error if the address is nullish', async () => {
			const result = await sign({ ...mockParams, address: null });

			expect(result).toEqual({ success: false });

			expect(signTransaction).not.toHaveBeenCalled();

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

			expect(mapSolTransactionMessage).toHaveBeenCalledExactlyOnceWith(mockParsedTransaction);

			expect(decodeTransactionMessage).toHaveBeenCalledExactlyOnceWith(mockTransaction);

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

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

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

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

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

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

		it('should not wait for sending to be confirmed', async () => {
			vi.spyOn(solSendServices, 'sendSignedTransaction').mockImplementationOnce(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve();
					}, 60_000);
				});
			});

			const result = await sign(mockParams);

			expect(result).toStrictEqual({ success: true });

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

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

		it('should not wait for errors when sending', async () => {
			const mockError = new Error('mock-send-error');

			vi.spyOn(solSendServices, 'sendSignedTransaction').mockImplementationOnce(() => {
				throw mockError;
			});

			const result = await sign(mockParams);

			expect(result).toStrictEqual({ success: true });

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

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

			expect(console.warn).not.toHaveBeenCalled();
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

			it('should return success when signing is successful', async () => {
				const result = await sign(mockParamsOther);

				expect(result).toStrictEqual({ success: true });

				expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).toHaveBeenCalledExactlyOnceWith({
					signedTransaction: mockSolSignedTransaction,
					rpc: expect.any(Object)
				});

				expect(mockParams.progress).toHaveBeenCalledTimes(3);
				expect(mockParams.progress).toHaveBeenNthCalledWith(1, ProgressStepsSendSol.SIGN);
				expect(mockParams.progress).toHaveBeenNthCalledWith(
					2,
					ProgressStepsSign.APPROVE_WALLET_CONNECT
				);
				expect(mockParams.progress).toHaveBeenNthCalledWith(3, ProgressStepsSendSol.DONE);
			});

			it('should not wait for errors when sending', async () => {
				const mockError = new Error('mock-send-error');

				vi.spyOn(solSendServices, 'sendSignedTransaction').mockImplementationOnce(() => {
					throw mockError;
				});

				const result = await sign(mockParamsOther);

				expect(result).toStrictEqual({ success: true });

				expect(signTransaction).toHaveBeenCalledExactlyOnceWith(mockTransactionMessage);

				expect(sendSignedTransaction).toHaveBeenCalledExactlyOnceWith({
					signedTransaction: mockSolSignedTransaction,
					rpc: expect.any(Object)
				});

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

				expect(console.warn).toHaveBeenCalledExactlyOnceWith(
					'WalletConnect Solana transaction send error',
					mockError
				);
			});
		});
	});
});
