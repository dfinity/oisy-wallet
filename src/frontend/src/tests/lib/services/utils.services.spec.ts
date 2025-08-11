import * as analyticsServices from '$lib/services/analytics.services';
import * as authServices from '$lib/services/auth.services';
import { wrapCallWith } from '$lib/services/utils.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockIdentity } from '$tests/mocks/identity.mock';

describe('utils.services', () => {
	describe('wrapCallWith', () => {
		const mockMethodToCall = vi.fn();
		const mockTrackEvent = vi.fn();
		const mockNullishSignOut = vi.fn();
		const mockToastsError = vi.fn();

		const successEventName = 'test_success';
		const errorEventName = 'test_error';
		const toastErrorMessage = 'Test error message';

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(mockTrackEvent);
			vi.spyOn(authServices, 'nullishSignOut').mockImplementation(mockNullishSignOut);
			vi.spyOn(toastsStore, 'toastsError').mockImplementation(mockToastsError);
		});

		it('should call nullishSignOut and return undefined when identity is nullish', async () => {
			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				toastErrorMessage,
				identity: null,
				trackEventNames: {
					success: successEventName,
					error: errorEventName
				}
			});

			const result = await wrappedFunction({ param1: 'value1' });

			expect(mockNullishSignOut).toHaveBeenCalled();
			expect(result).toBeUndefined();
			expect(mockMethodToCall).not.toHaveBeenCalled();
			expect(mockTrackEvent).not.toHaveBeenCalled();
			expect(mockToastsError).not.toHaveBeenCalled();
		});

		it('should call the wrapped method with identity and params when identity is provided', async () => {
			mockMethodToCall.mockResolvedValue('success result');

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				identity: mockIdentity
			});

			const params = { param1: 'value1' };
			const result = await wrappedFunction(params);

			expect(mockMethodToCall).toHaveBeenCalledWith({
				...params,
				identity: mockIdentity
			});

			expect(result).toBe('success result');
			expect(mockNullishSignOut).not.toHaveBeenCalled();
			expect(mockToastsError).not.toHaveBeenCalled();
		});

		it('should track success event when the wrapped method succeeds', async () => {
			mockMethodToCall.mockResolvedValue('success result');

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				identity: mockIdentity,
				trackEventNames: {
					success: successEventName,
					error: errorEventName
				}
			});

			await wrappedFunction({ param1: 'value1' });

			expect(mockTrackEvent).toHaveBeenCalledWith({
				name: successEventName
			});

			expect(mockTrackEvent).not.toHaveBeenCalledWith({
				name: errorEventName,
				metadata: expect.anything()
			});
		});

		it('should not track success event when success event name is nullish', async () => {
			mockMethodToCall.mockResolvedValue('success result');

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				identity: mockIdentity,
				trackEventNames: {
					error: errorEventName
				}
			});

			await wrappedFunction({ param1: 'value1' });

			expect(mockTrackEvent).not.toHaveBeenCalled();
		});

		it('should track error event and show toast when the wrapped method fails', async () => {
			const testError = new Error('Test error');
			mockMethodToCall.mockRejectedValue(testError);

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				toastErrorMessage,
				identity: mockIdentity,
				trackEventNames: {
					success: successEventName,
					error: errorEventName
				}
			});

			await expect(wrappedFunction({ param1: 'value1' })).resolves.toBeUndefined();

			expect(mockTrackEvent).toHaveBeenCalledWith({
				name: errorEventName,
				metadata: { error: expect.any(String) }
			});

			expect(mockToastsError).toHaveBeenCalledWith({
				msg: { text: toastErrorMessage },
				err: testError
			});

			expect(mockTrackEvent).not.toHaveBeenCalledWith({
				name: successEventName
			});
		});

		it('should not track error event when error event name is nullish', async () => {
			const testError = new Error('Test error');
			mockMethodToCall.mockRejectedValue(testError);

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				toastErrorMessage,
				identity: mockIdentity,
				trackEventNames: {
					success: successEventName
				}
			});

			await expect(wrappedFunction({ param1: 'value1' })).resolves.toBeUndefined();

			expect(mockTrackEvent).not.toHaveBeenCalled();
			expect(mockToastsError).toHaveBeenCalledWith({
				msg: { text: toastErrorMessage },
				err: testError
			});
		});

		it('should not show toast when toastErrorMessage is nullish', async () => {
			const testError = new Error('Test error');
			mockMethodToCall.mockRejectedValue(testError);

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				identity: mockIdentity,
				trackEventNames: {
					success: successEventName,
					error: errorEventName
				}
			});

			await expect(wrappedFunction({ param1: 'value1' })).rejects.toThrow(testError);

			expect(mockTrackEvent).toHaveBeenCalledWith({
				name: errorEventName,
				metadata: { error: expect.any(String) }
			});

			expect(mockToastsError).not.toHaveBeenCalled();
		});

		it('should work with default empty trackEventNames object', async () => {
			mockMethodToCall.mockResolvedValue('success result');

			const wrappedFunction = wrapCallWith({
				methodToCall: mockMethodToCall,
				identity: mockIdentity
			});

			await wrappedFunction({});

			expect(mockTrackEvent).not.toHaveBeenCalled();
		});
	});
});
