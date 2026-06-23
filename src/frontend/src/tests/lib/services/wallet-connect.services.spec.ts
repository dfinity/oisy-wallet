import { WalletConnectClient } from '$lib/providers/wallet-connect.providers';
import {
	connectListener,
	disconnectSession,
	execute,
	reject,
	resetListener,
	resetListenerIfNoSessions,
	syncSessions,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { busy } from '$lib/stores/busy.store';
import * as toastsStore from '$lib/stores/toasts.store';
import {
	walletConnectListenerStore,
	walletConnectSessionsStore
} from '$lib/stores/wallet-connect.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import type { SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('wallet-connect.services', () => {
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
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.no_connection_opened }
			});

			const resultForUndefined = await execute({
				...mockExecuteParams,
				params: { ...mockParams, listener: undefined }
			});

			expect(resultForUndefined).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledTimes(2);
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: en.wallet_connect.error.no_connection_opened }
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(2, {
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
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.request_not_defined }
			});

			const resultForUndefined = await execute({
				...mockExecuteParams,
				// @ts-expect-error we test this in purposes
				params: { ...mockParams, request: undefined }
			});

			expect(resultForUndefined).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledTimes(2);
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: en.wallet_connect.error.request_not_defined }
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(2, {
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

	describe('session lifecycle helpers', () => {
		const sessionA = { topic: 'topic-a' } as unknown as SessionTypes.Struct;
		const sessionB = { topic: 'topic-b' } as unknown as SessionTypes.Struct;

		const setListener = (overrides: Partial<WalletConnectListener>) =>
			walletConnectListenerStore.set({
				...mockListener,
				...overrides
			} as unknown as WalletConnectListener);

		beforeEach(() => {
			vi.clearAllMocks();
			walletConnectListenerStore.reset();
			walletConnectSessionsStore.reset();
		});

		describe('syncSessions', () => {
			it('should return an empty array and clear the store when no listener is set', () => {
				walletConnectSessionsStore.set([sessionA]);

				expect(syncSessions()).toEqual([]);
				expect(get(walletConnectSessionsStore)).toEqual([]);
			});

			it('should mirror the active sessions into the store', () => {
				setListener({
					getActiveSessions: vi.fn().mockReturnValue({ a: sessionA, b: sessionB })
				});

				expect(syncSessions()).toEqual([sessionA, sessionB]);
				expect(get(walletConnectSessionsStore)).toEqual([sessionA, sessionB]);
			});
		});

		describe('resetListener', () => {
			it('should clear both the listener and the sessions store', () => {
				setListener({});
				walletConnectSessionsStore.set([sessionA]);

				resetListener();

				expect(get(walletConnectListenerStore)).toBeUndefined();
				expect(get(walletConnectSessionsStore)).toEqual([]);
			});
		});

		describe('resetListenerIfNoSessions', () => {
			it('should keep the listener when sessions remain', () => {
				const detachHandlers = vi.fn();

				setListener({
					detachHandlers,
					getActiveSessions: vi.fn().mockReturnValue({ a: sessionA })
				});

				expect(resetListenerIfNoSessions()).toEqual([sessionA]);
				expect(detachHandlers).not.toHaveBeenCalled();
				expect(get(walletConnectListenerStore)).not.toBeUndefined();
			});

			it('should detach handlers and reset when no sessions remain', () => {
				const detachHandlers = vi.fn();

				setListener({
					detachHandlers,
					getActiveSessions: vi.fn().mockReturnValue({})
				});

				expect(resetListenerIfNoSessions()).toEqual([]);
				expect(detachHandlers).toHaveBeenCalledOnce();
				expect(get(walletConnectListenerStore)).toBeUndefined();
				expect(get(walletConnectSessionsStore)).toEqual([]);
			});
		});

		describe('disconnectSession', () => {
			it('should do nothing and report failure when no listener is set', async () => {
				const spy = vi.spyOn(mockListener, 'disconnectSession');

				await expect(disconnectSession('topic-a')).resolves.toEqual({ success: false });

				expect(spy).not.toHaveBeenCalled();
			});

			it('should disconnect only the given topic and keep the listener when others remain', async () => {
				const disconnectSessionSpy = vi.fn();
				const disconnectSpy = vi.fn();

				setListener({
					disconnectSession: disconnectSessionSpy,
					disconnect: disconnectSpy,
					getActiveSessions: vi.fn().mockReturnValue({ b: sessionB })
				});

				await expect(disconnectSession('topic-a')).resolves.toEqual({ success: true });

				expect(disconnectSessionSpy).toHaveBeenCalledExactlyOnceWith('topic-a');
				expect(get(walletConnectSessionsStore)).toEqual([sessionB]);
				expect(disconnectSpy).not.toHaveBeenCalled();
				expect(get(walletConnectListenerStore)).not.toBeUndefined();
			});

			it('should fall through to a full teardown when the last session is removed', async () => {
				const disconnectSessionSpy = vi.fn();
				const disconnectSpy = vi.fn();
				const detachHandlers = vi.fn();

				setListener({
					disconnectSession: disconnectSessionSpy,
					disconnect: disconnectSpy,
					detachHandlers,
					getActiveSessions: vi.fn().mockReturnValue({})
				});

				await expect(disconnectSession('topic-a')).resolves.toEqual({ success: true });

				expect(disconnectSessionSpy).toHaveBeenCalledExactlyOnceWith('topic-a');
				expect(disconnectSpy).toHaveBeenCalledOnce();
				expect(get(walletConnectListenerStore)).toBeUndefined();
				expect(get(walletConnectSessionsStore)).toEqual([]);
			});

			it('should report failure and not tear down when the listener throws', async () => {
				const disconnectSessionSpy = vi.fn().mockRejectedValue(new Error('disconnect failed'));
				const disconnectSpy = vi.fn();

				setListener({
					disconnectSession: disconnectSessionSpy,
					disconnect: disconnectSpy,
					getActiveSessions: vi.fn().mockReturnValue({ a: sessionA })
				});

				await expect(disconnectSession('topic-a')).resolves.toEqual({ success: false });

				expect(disconnectSpy).not.toHaveBeenCalled();
				expect(get(walletConnectListenerStore)).not.toBeUndefined();
			});
		});
	});

	describe('connectListener', () => {
		const mockUri = 'wc:existing-pairing@2?relay-protocol=irn&symKey=abc';

		beforeEach(() => {
			vi.clearAllMocks();
			walletConnectListenerStore.reset();
			walletConnectSessionsStore.reset();
		});

		// Acceptance criterion 1: connecting a new dApp must not drop already-connected dApps.
		it('should reuse the existing listener without tearing down the current connection', async () => {
			const initSpy = vi.spyOn(WalletConnectClient, 'init');

			const existingListener = {
				...mockListener,
				pair: vi.fn().mockResolvedValue(undefined),
				attachHandlers: vi.fn(),
				disconnect: vi.fn(),
				getActiveSessions: vi.fn().mockReturnValue({ 'topic-1': { topic: 'topic-1' } })
			} as unknown as WalletConnectListener;

			walletConnectListenerStore.set(existingListener);

			const { result } = await connectListener({ uri: mockUri });

			expect(result).toBe('success');
			expect(initSpy).not.toHaveBeenCalled();
			expect(existingListener.disconnect).not.toHaveBeenCalled();
			expect(existingListener.pair).toHaveBeenCalledExactlyOnceWith(mockUri);
			expect(existingListener.attachHandlers).toHaveBeenCalledOnce();
			expect(get(walletConnectListenerStore)).toBe(existingListener);
		});
	});
});
