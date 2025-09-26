import { OISY_URL } from '$lib/constants/oisy.constants';
import * as analytics from '$lib/services/analytics.services';
import * as authBroadcastServices from '$lib/services/auth-broadcast.services';
import {
	AUTH_BROADCAST_CHANNEL,
	AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS
} from '$lib/services/auth-broadcast.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import App from '$routes/+layout.svelte';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

vi.mock(import('$lib/services/worker.auth.services'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		initAuthWorker: vi.fn().mockResolvedValue({
			syncAuthIdle: vi.fn()
		})
	};
});

describe('App Layout', () => {
	const mockChannels = new Map<string, BroadcastChannel>();

	const broadcastChannelCloseSpy = vi.fn();

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

	it('should initialize a BroadcastChannel for auth synchronization', () => {
		const spy = vi.spyOn(authBroadcastServices, 'initAuthBroadcastChannel');

		expect(spy).not.toHaveBeenCalled();

		render(App, { children: mockSnippet });

		expect(spy).toHaveBeenCalledExactlyOnceWith();
	});

	it('should listen to BroadcastChannel events for auth synchronization', () => {
		const spy = vi.spyOn(authStore, 'forceSync');

		render(App, { children: mockSnippet });

		spy.mockClear();

		const newBc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

		newBc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);

		expect(spy).toHaveBeenCalledExactlyOnceWith();
	});

	it('should destroy the BroadcastChannel on unmount', () => {
		const spy = vi.spyOn(authStore, 'forceSync');

		const { unmount } = render(App, { children: mockSnippet });

		spy.mockClear();

		const newBc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

		newBc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);

		expect(spy).toHaveBeenCalledExactlyOnceWith();

		expect(broadcastChannelCloseSpy).not.toHaveBeenCalled();

		spy.mockClear();

		unmount();

		expect(broadcastChannelCloseSpy).toHaveBeenCalledExactlyOnceWith();

		newBc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);

		expect(spy).toHaveBeenCalledExactlyOnceWith();
	});
});
