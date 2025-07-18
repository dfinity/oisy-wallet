import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { execute } from '$lib/services/wallet-connect.services';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { decode, sign } from '$sol/services/wallet-connect.services';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import * as solTransactionsUtils from '$sol/utils/sol-transactions.utils';
import {
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignedTransaction } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';
import type { MockInstance } from 'vitest';
import type { CompilableTransactionMessage } from '@solana/kit';

describe('wallet-connect.services', () => {
	const parsedTransaction = { mock: 'parsedTransaction' };
	const mappedTransaction = { mock: 'mappedTransaction' };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.spyOn(solTransactionsUtils, 'parseSolBase64TransactionMessage').mockResolvedValue(
			parsedTransaction as unknown as CompilableTransactionMessage
		);
		vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockResolvedValue(
			mappedTransaction as unknown as MappedSolTransaction
		);
		vi.spyOn(solTransactionsUtils, 'decodeTransactionMessage').mockImplementation(
			() => mockSolSignedTransaction
		);
		vi.spyOn(solTransactionsUtils, 'transactionMessageHasBlockhashLifetime').mockReturnValue(true);
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
			expect(mapSolTransactionMessage).toHaveBeenCalledWith(parsedTransaction);
			expect(result).toEqual(mappedTransaction);
		});
	});

	describe('sign', () => {
		let spyToastsShow: MockInstance;
		let spyToastsError: MockInstance;

		const mockParams = {
			address: mockSolAddress,
			modalNext: vi.fn(),
			token: SOLANA_TOKEN,
			progress: vi.fn(),
			identity: mockIdentity,
			request: {
				params: { request: { method: 'mockMethod', params: { transaction: 'mock-transaction' } } }
			} as Web3WalletTypes.SessionRequest,
			listener: {
				rejectRequest: vi.fn()
			} as unknown as WalletConnectListener
		};

		beforeEach(() => {
			vi.spyOn(console, 'error').mockImplementation(() => {});

			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		it('should show an error if the address is nullish', async () => {
			const result = await sign({ ...mockParams, address: null });

			expect(result).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.wallet_not_initialized }
			});
		});

		it('should return success with amount and destination when signing is successful', async () => {
			const mockCallbackResponse = {
				success: true,
				amount: BigInt(1000),
				destination: 'mockDestination'
			};

			const result = await sign(mockParams);

			expect(result).toEqual(mockCallbackResponse);
			expect(mockParams.modalNext).toHaveBeenCalled();
			expect(mockParams.progress).toHaveBeenCalledWith('SIGN');
		});

		it('should handle errors and reject the request when an error occurs', async () => {
			const mockParams = {
				address: 'mockAddress',
				modalNext: vi.fn(),
				token: { network: { id: 'mockNetworkId' }, symbol: 'SOL' },
				progress: vi.fn(),
				identity: 'mockIdentity',
				params: {}
			};

			const errorMessage = new Error('Unexpected Error');

			(execute as any).mockRejectedValue(errorMessage);

			await expect(sign(mockParams)).rejects.toThrow('Unexpected Error');
			expect(trackEvent).toHaveBeenCalledWith({
				name: 'TRACK_COUNT_WC_SOL_SEND_ERROR',
				metadata: {
					token: 'SOL'
				}
			});
			expect(toastsError).not.toHaveBeenCalled();
		});

		it('should show an error if the address is nullish', async () => {
			const mockParams = {
				address: null,
				modalNext: vi.fn(),
				token: { network: { id: 'mockNetworkId' }, symbol: 'SOL' },
				progress: vi.fn(),
				identity: 'mockIdentity',
				params: {}
			};

			const errorToastMessage = 'Wallet not initialised';

			(toastsError as any).mockImplementation(() => {
				throw new Error(errorToastMessage);
			});

			await expect(sign(mockParams)).rejects.toThrow(errorToastMessage);
			expect(toastsError).toHaveBeenCalled();
		});
	});
});
