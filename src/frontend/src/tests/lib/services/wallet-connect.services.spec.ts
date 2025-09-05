import {
	execute,
	reject,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { busy } from '$lib/stores/busy.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { getSdkError } from '@walletconnect/utils';
import type { MockInstance } from 'vitest';

describe('wallet-connect.services', () => {
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
	const mockRequest = {} as WalletKitTypes.SessionRequest;
	const mockParams = {
		request: mockRequest,
		listener: mockListener
	} as WalletConnectExecuteParams;

	describe('execute', () => {
		let spyToastsShow: MockInstance;
		let spyToastsError: MockInstance;

		const mockCallback = vi.fn();

		const mockToastMsg = 'Operation successful';

		const mockExecuteParams = {
			params: mockParams,
			callback: mockCallback,
			toastMsg: mockToastMsg
		};

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		it('should show an error toast if listener is nullish', async () => {
			const resultForNull = await execute({
				...mockExecuteParams,
				params: { ...mockParams, listener: null }
			});

			expect(resultForNull).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.no_connection_opened }
			});

			const resultForUndefined = await execute({
				...mockExecuteParams,
				params: { ...mockParams, listener: undefined }
			});

			expect(resultForUndefined).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.no_connection_opened }
			});
		});

		it('should show an error toast if request is nullish', async () => {
			const resultForNull = await execute({
				...mockExecuteParams,
				// @ts-expect-error we test this in purposes
				params: { ...mockParams, request: null }
			});

			expect(resultForNull).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.request_not_defined }
			});

			const resultForUndefined = await execute({
				...mockExecuteParams,
				// @ts-expect-error we test this in purposes
				params: { ...mockParams, request: undefined }
			});

			expect(resultForUndefined).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.request_not_defined }
			});
		});

		it('should execute callback and show success toast on successful operation', async () => {
			mockCallback.mockResolvedValueOnce({ success: true });

			const result = await execute(mockExecuteParams);

			expect(result).toEqual({ success: true });
			expect(mockCallback).toHaveBeenCalledWith({
				request: mockRequest,
				listener: mockListener
			});
			expect(spyToastsShow).toHaveBeenCalledWith({
				text: mockToastMsg,
				level: 'info',
				duration: 2000
			});
		});

		it('should return the error object if callback fails', async () => {
			const mockError = { code: 500, message: 'Internal error' };
			mockCallback.mockResolvedValueOnce({ success: false, err: mockError });

			const result = await execute(mockExecuteParams);

			expect(result).toEqual({ success: false, err: mockError });
			expect(mockCallback).toHaveBeenCalledWith({
				request: mockRequest,
				listener: mockListener
			});
			expect(spyToastsShow).not.toHaveBeenCalled();
		});

		it('should show an error toast if an exception occurs in the callback', async () => {
			const mockError = new Error('Unexpected error');
			mockCallback.mockRejectedValueOnce(mockError);

			const result = await execute(mockExecuteParams);

			expect(result).toEqual({ success: false, err: mockError });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.unexpected_processing_request },
				err: mockError
			});
		});
	});

	describe('reject', () => {
		let spyToastsShow: MockInstance;

		let spyBusyStart: MockInstance;
		let spyBusyStop: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');

			spyBusyStart = vi.spyOn(busy, 'start');
			spyBusyStop = vi.spyOn(busy, 'stop');
		});

		it('should start the busy store', async () => {
			await reject(mockParams);

			expect(spyBusyStart).toHaveBeenCalledExactlyOnceWith();
		});

		it('should reject the request and return success', async () => {
			const result = await reject(mockParams);

			expect(result).toEqual({ success: true });

			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: mockRequest.topic,
				id: mockRequest.id,
				error: getSdkError('USER_REJECTED')
			});

			expect(spyBusyStop).toHaveBeenCalledExactlyOnceWith();
		});

		it('should show a successful toast if reject is successful', async () => {
			const result = await reject(mockParams);

			expect(result).toEqual({ success: true });

			expect(spyToastsShow).toHaveBeenCalledWith({
				text: en.wallet_connect.error.request_rejected,
				level: 'info',
				duration: 2000
			});
		});

		it('should stop the busy store even if the listener throws', async () => {
			const mockError = new Error('Listener error');

			vi.spyOn(mockListener, 'rejectRequest').mockRejectedValueOnce(mockError);

			await expect(reject(mockParams)).resolves.toEqual({ success: false, err: mockError });

			expect(spyBusyStop).toHaveBeenCalledExactlyOnceWith();
		});
	});
});
