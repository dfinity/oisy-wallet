import { OISY_URL } from '$lib/constants/oisy.constants';
import {
	AUTH_BROADCAST_CHANNEL,
	AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS,
	broadcastAuthClientLoginSuccess,
	initAuthBroadcastChannel,
	type AuthBroadcastChannelInterface
} from '$lib/services/auth-broadcast.services';
import { authStore } from '$lib/stores/auth.store';

describe('auth-broadcast.services', () => {
	const postMessageSpy = vi.fn();
	const closeSpy = vi.fn();

	const mockOrigin = vi.fn().mockReturnValue(OISY_URL);

	const mockChannels = new Map<string, BroadcastChannel>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.stubGlobal(
			'BroadcastChannel',
			vi.fn((name: string) => {
				const channel =
					mockChannels.get(name) ??
					({
						name,
						onmessage: null,
						postMessage: postMessageSpy,
						close: closeSpy
					} as unknown as BroadcastChannel);

				postMessageSpy.mockImplementation((message: unknown) => {
					const event = new MessageEvent('message', {
						data: message,
						origin: mockOrigin()
					});

					channel.onmessage?.(event);
				});

				mockChannels.set(name, channel);

				return channel;
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('initAuthBroadcastChannel', () => {
		let bc: AuthBroadcastChannelInterface;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(authStore, 'forceSync').mockImplementation(vi.fn());

			bc = initAuthBroadcastChannel();
		});

		afterEach(() => {
			bc.close();
		});

		it('should create a BroadcastChannel with the correct name', () => {
			expect(BroadcastChannel).toHaveBeenCalledExactlyOnceWith(AUTH_BROADCAST_CHANNEL);
		});

		it('should set up onmessage handler', () => {
			const newBc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

			newBc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);

			expect(authStore.forceSync).toHaveBeenCalledExactlyOnceWith();
		});

		it('should not call handler for different messages', () => {
			const newBc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

			newBc.postMessage('someOtherMessage');

			expect(authStore.forceSync).not.toHaveBeenCalled();
		});

		it('should not call handler for messages from different origins', () => {
			mockOrigin.mockReturnValueOnce('https://malicious.com');

			const newBc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

			newBc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);

			expect(authStore.forceSync).not.toHaveBeenCalled();
		});
	});

	describe('broadcastAuthClientLoginSuccess', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should create a BroadcastChannel with the correct name', () => {
			broadcastAuthClientLoginSuccess();

			expect(BroadcastChannel).toHaveBeenCalledExactlyOnceWith(AUTH_BROADCAST_CHANNEL);
		});

		it('should post a login success message', () => {
			broadcastAuthClientLoginSuccess();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);
		});

		it('should close the BroadcastChannel after posting the message', () => {
			broadcastAuthClientLoginSuccess();

			expect(closeSpy).toHaveBeenCalledExactlyOnceWith();
		});

		it('should not close all the BroadcastChannel after posting the message', () => {
			vi.spyOn(authStore, 'forceSync').mockImplementation(vi.fn());

			initAuthBroadcastChannel();

			broadcastAuthClientLoginSuccess();

			expect(closeSpy).toHaveBeenCalledExactlyOnceWith();

			expect(authStore.forceSync).toHaveBeenCalledExactlyOnceWith();

			const newBc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

			newBc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);

			expect(authStore.forceSync).toHaveBeenCalledTimes(2);
		});
	});
});
