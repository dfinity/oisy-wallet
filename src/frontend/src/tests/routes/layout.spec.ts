import { OISY_URL } from '$lib/constants/oisy.constants';
import { AuthBroadcastChannel } from '$lib/providers/auth-broadcast.providers';
import * as analytics from '$lib/services/analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsShow } from '$lib/stores/toasts.store';
import App from '$routes/+layout.svelte';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { default as en } from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/worker.auth.services', () => ({
	AuthWorker: {
		init: vi.fn()
	}
}));

vi.mock('$lib/providers/auth-broadcast.providers', async (importActual) => ({
	...(await importActual())
}));

describe('App Layout', () => {
	beforeAll(() => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});
	});

	it('should render the app layout', () => {
		const { container } = render(App);

		expect(container).toBeTruthy();
	});

	it('should initialize all services in parallel', () => {
		const spyAuthSync = vi.spyOn(authStore, 'sync').mockImplementation(vi.fn());
		const spyInitPlausibleAnalytics = vi.spyOn(analytics, 'initPlausibleAnalytics');
		const spyI18n = vi.spyOn(i18n, 'init');

		render(App, { children: mockSnippet });

		expect(spyAuthSync).toHaveBeenCalledOnce();
		expect(spyInitPlausibleAnalytics).toHaveBeenCalledOnce();
		expect(spyI18n).toHaveBeenCalledOnce();
	});

	it('should initialize analytics tracking on mount', () => {
		const spy = vi.spyOn(analytics, 'initPlausibleAnalytics');

		expect(spy).not.toHaveBeenCalled();

		render(App, { children: mockSnippet });

		expect(spy).toHaveBeenCalledOnce();
	});

	describe('when handling AuthBroadcastChannel', () => {
		const channelName = AuthBroadcastChannel.CHANNEL_NAME;

		const loginSuccessMessage = AuthBroadcastChannel.MESSAGE_LOGIN_SUCCESS;

		const mockChannels = new Map<string, BroadcastChannel>();

		const broadcastChannelCloseSpy = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			vi.stubGlobal(
				'BroadcastChannel',
				vi.fn((name: string) => {
					const postMessage = vi.fn();

					const channel =
						mockChannels.get(name) ??
						({
							name,
							onmessage: null,
							postMessage,
							close: broadcastChannelCloseSpy
						} as unknown as BroadcastChannel);

					postMessage.mockImplementation((message: unknown) => {
						const event = new MessageEvent('message', {
							data: message,
							origin: OISY_URL
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

		it('should destroy the channel on unmount', () => {
			const spy = vi.spyOn(authStore, 'forceSync');

			const { unmount } = render(App, { children: mockSnippet });

			spy.mockClear();

			const newBc = new BroadcastChannel(channelName);

			newBc.postMessage(loginSuccessMessage);

			expect(spy).toHaveBeenCalledExactlyOnceWith();

			expect(broadcastChannelCloseSpy).not.toHaveBeenCalled();

			spy.mockClear();

			unmount();

			expect(broadcastChannelCloseSpy).toHaveBeenCalledExactlyOnceWith();

			newBc.postMessage(loginSuccessMessage);

			expect(spy).toHaveBeenCalledExactlyOnceWith();
		});

		it('should initialize a channel for auth synchronization', () => {
			const spy = vi
				.spyOn(AuthBroadcastChannel.prototype, 'onLoginSuccess')
				.mockImplementationOnce(vi.fn());

			vi.spyOn(AuthBroadcastChannel.prototype, 'close').mockImplementationOnce(vi.fn());

			expect(spy).not.toHaveBeenCalled();

			render(App, { children: mockSnippet });

			expect(spy).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
		});

		describe('on login success message', () => {
			beforeEach(() => {
				vi.clearAllMocks();

				vi.spyOn(toastsStore, 'toastsShow');
			});

			it('should trigger the forced re-synchronization', () => {
				mockAuthSignedIn(false);

				const spy = vi.spyOn(authStore, 'forceSync').mockImplementationOnce(async () => {
					mockAuthSignedIn();

					await Promise.resolve();
				});

				render(App, { children: mockSnippet });

				spy.mockClear();

				const newBc = new BroadcastChannel(channelName);

				newBc.postMessage(loginSuccessMessage);

				expect(spy).toHaveBeenCalledExactlyOnceWith();
			});

			it('should show a toast if the page was logged out before the re-synchronization', async () => {
				mockAuthSignedIn(false);

				vi.spyOn(authStore, 'forceSync').mockImplementationOnce(async () => {
					mockAuthSignedIn();

					await Promise.resolve();
				});

				render(App, { children: mockSnippet });

				const newBc = new BroadcastChannel(channelName);

				newBc.postMessage(loginSuccessMessage);

				await waitFor(() => {
					expect(toastsShow).toHaveBeenCalledExactlyOnceWith({
						text: en.auth.message.refreshed_authentication,
						level: 'success'
					});
				});
			});

			it('should do nothing if after the re-synchronization it is logged out', async () => {
				mockAuthSignedIn(false);

				render(App, { children: mockSnippet });

				const newBc = new BroadcastChannel(channelName);

				newBc.postMessage(loginSuccessMessage);

				await waitFor(() => {
					expect(toastsShow).not.toHaveBeenCalled();
				});
			});
		});
	});
});
