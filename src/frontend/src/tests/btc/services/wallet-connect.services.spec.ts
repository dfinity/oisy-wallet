import {
	BTC_ECDSA_DERIVATION_PATH,
	BTC_ECDSA_KEY_ID,
	SESSION_REQUEST_BTC_SIGN_MESSAGE
} from '$btc/constants/wallet-connect.constants';
import { decodeMessage, sign } from '$btc/services/wallet-connect.services';
import * as walletConnectUtils from '$btc/utils/wallet-connect.utils';
import { genericSignWithEcdsa } from '$lib/api/signer.api';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSign } from '$lib/enums/progress-steps';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/signer.api');

vi.mock(import('$btc/utils/wallet-connect.utils'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		deriveBtcPublicKey: vi.fn(),
		encodeRecoverableSignature: vi.fn()
	};
});

describe('btc wallet-connect.services', () => {
	const mockMessage = 'hello';
	const mockSignature = 'mock-base64-signature';
	const mockRawSignature = new Uint8Array(64).fill(1);
	const mockPublicKey = new Uint8Array(33).fill(2);

	const mockListener = {
		pair: vi.fn(),
		approveSession: vi.fn(),
		rejectSession: vi.fn(),
		attachHandlers: vi.fn(),
		detachHandlers: vi.fn(),
		rejectRequest: vi.fn(),
		getActiveSessions: vi.fn(),
		approveRequest: vi.fn(),
		disconnect: vi.fn()
	} as WalletConnectListener;

	let spyToastsShow: MockInstance;
	let spyToastsError: MockInstance;

	const createMockRequest = ({
		params = { message: mockMessage }
	}: {
		params?: Record<string, unknown>;
	} = {}): WalletKitTypes.SessionRequest =>
		({
			id: 123,
			topic: 'mock-topic',
			params: {
				request: {
					method: SESSION_REQUEST_BTC_SIGN_MESSAGE,
					params
				}
			}
		}) as WalletKitTypes.SessionRequest;

	const createMockParams = (request = createMockRequest()) => ({
		address: mockBtcAddress,
		modalNext: vi.fn(),
		progress: vi.fn(),
		identity: mockIdentity,
		request,
		listener: mockListener
	});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(genericSignWithEcdsa).mockResolvedValue(mockRawSignature);
		vi.mocked(walletConnectUtils.deriveBtcPublicKey).mockReturnValue(mockPublicKey);
		vi.mocked(walletConnectUtils.encodeRecoverableSignature).mockReturnValue(mockSignature);

		spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
		spyToastsError = vi.spyOn(toastsStore, 'toastsError');
	});

	describe('decodeMessage', () => {
		it('should extract the signMessage payload', () => {
			expect(decodeMessage(createMockRequest())).toBe(mockMessage);
		});

		it('should fall back to an empty message when the parameter is missing', () => {
			expect(decodeMessage(createMockRequest({ params: {} }))).toBe('');
		});
	});

	describe('sign', () => {
		it('should reject the request when the BTC address is nullish', async () => {
			const params = createMockParams();

			const result = await sign({ ...params, address: null });

			expect(result).toEqual({ success: false });
			expect(genericSignWithEcdsa).not.toHaveBeenCalled();
			expect(params.modalNext).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.wallet_not_initialized }
			});
		});

		it('should reject the request when the message parameter is missing', async () => {
			const params = createMockParams(createMockRequest({ params: {} }));

			const result = await sign(params);

			expect(result).toEqual({ success: false });
			expect(genericSignWithEcdsa).not.toHaveBeenCalled();
			expect(params.modalNext).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.unknown_parameter }
			});
		});

		it('should reject the request when the identity is nullish', async () => {
			const params = createMockParams();

			const result = await sign({ ...params, identity: null });

			expect(result).toEqual({ success: false });
			expect(genericSignWithEcdsa).not.toHaveBeenCalled();
			expect(params.modalNext).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.auth.error.no_internet_identity }
			});
		});

		it('should approve the request with a BTC recoverable signature and address', async () => {
			const params = createMockParams();
			const messageHash = walletConnectUtils.bitcoinSignedMessageHash(mockMessage);

			const result = await sign(params);

			expect(result).toStrictEqual({ success: true });
			expect(genericSignWithEcdsa).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				derivationPath: BTC_ECDSA_DERIVATION_PATH,
				keyId: BTC_ECDSA_KEY_ID,
				messageHash
			});
			expect(walletConnectUtils.deriveBtcPublicKey).toHaveBeenCalledExactlyOnceWith({
				principal: mockIdentity.getPrincipal()
			});
			expect(walletConnectUtils.encodeRecoverableSignature).toHaveBeenCalledExactlyOnceWith({
				signature: mockRawSignature,
				messageHash,
				publicKey: mockPublicKey
			});
			expect(params.modalNext).toHaveBeenCalledOnce();
			expect(params.progress).toHaveBeenCalledTimes(3);
			expect(params.progress).toHaveBeenNthCalledWith(1, ProgressStepsSign.SIGN);
			expect(params.progress).toHaveBeenNthCalledWith(2, ProgressStepsSign.APPROVE_WALLET_CONNECT);
			expect(params.progress).toHaveBeenNthCalledWith(3, ProgressStepsSign.DONE);
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				message: { signature: mockSignature, address: mockBtcAddress }
			});
			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
			expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: replacePlaceholders(en.wallet_connect.info.transaction_executed, {
					$method: SESSION_REQUEST_BTC_SIGN_MESSAGE
				}),
				level: 'info',
				duration: 2000
			});
			expect(spyToastsError).not.toHaveBeenCalled();
		});

		it('should reject the request when signing fails', async () => {
			const params = createMockParams();
			const mockError = new Error('mock-sign-error');

			vi.mocked(genericSignWithEcdsa).mockRejectedValueOnce(mockError);

			const result = await sign(params);

			expect(result).toStrictEqual({ success: false, err: mockError });
			expect(params.modalNext).toHaveBeenCalledOnce();
			expect(params.progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSign.SIGN);
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsShow).not.toHaveBeenCalled();
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.unexpected_processing_request },
				err: mockError
			});
		});
	});
});
