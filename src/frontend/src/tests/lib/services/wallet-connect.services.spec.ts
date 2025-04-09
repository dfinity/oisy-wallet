import { execute, type WalletConnectExecuteParams } from '$lib/services/wallet-connect.services';
import * as toastsStore from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import type { MockInstance } from 'vitest';

describe('wallet-connect.services', () => {
	describe('execute', () => {
		let spyToastsShow: MockInstance;
		let spyToastsError: MockInstance;

		const mockCallback = vi.fn();
		const mockListener = {};
		const mockRequest = {};
		const mockParams = {
			request: mockRequest,
			listener: mockListener
		} as WalletConnectExecuteParams;
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
});
