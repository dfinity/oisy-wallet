const trackMock = vi.fn();
const initMock = vi.fn();

let mockLocal = false;
let mockStaging = false;
let mockBrowser = true;
let mockPlausibleEnabled = true;
let mockPlausibleDomain: string | null = 'test.com';
let mockLoadTracker: () => { init: typeof initMock; track: typeof trackMock };

vi.mock('$lib/services/analytics-wrapper', () => ({
	loadPlausibleTracker: vi.fn(() => mockLoadTracker())
}));

vi.mock('$app/environment', () => ({
	get browser() {
		return mockBrowser;
	}
}));

vi.mock('$env/plausible.env', () => ({
	get PLAUSIBLE_ENABLED() {
		return mockPlausibleEnabled;
	},
	get PLAUSIBLE_DOMAIN() {
		return mockPlausibleDomain;
	}
}));

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		get LOCAL() {
			return mockLocal;
		},
		get STAGING() {
			return mockStaging;
		}
	};
});

describe('plausible analytics service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();

		mockLocal = false;
		mockStaging = false;
		mockBrowser = true;
		mockPlausibleEnabled = true;
		mockPlausibleDomain = 'test.com';
		mockLoadTracker = () => ({ init: initMock, track: trackMock });
	});

	it('should initialize Plausible with correct config', async () => {
		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		expect(initMock).toHaveBeenCalledWith({
			domain: 'test.com'
		});
	});

	it('should call track with metadata', async () => {
		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).toHaveBeenCalledWith('test_event', {
			props: { key: 'value' }
		});
	});

	it('should call track without metadata', async () => {
		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event'
		});

		expect(trackMock).toHaveBeenCalledWith('test_event', {
			props: undefined
		});
	});

	it('should log warning when provided', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' },
			warning: 'Test warning message'
		});

		expect(trackMock).toHaveBeenCalled();
		expect(consoleWarnSpy).toHaveBeenCalledWith('Test warning message');

		consoleWarnSpy.mockRestore();
	});

	it('should NOT log warning when not provided', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).toHaveBeenCalled();
		expect(consoleWarnSpy).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});

	it('should NOT initialize if browser is false', async () => {
		mockBrowser = false;

		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		expect(initMock).not.toHaveBeenCalled();
	});

	it('should NOT track if not initialized', async () => {
		mockPlausibleDomain = null;

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();
	});

	it('should NOT initialize if PLAUSIBLE_ENABLED is false', async () => {
		mockPlausibleEnabled = false;

		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		expect(initMock).not.toHaveBeenCalled();
	});

	it('should NOT track if PLAUSIBLE_ENABLED is false', async () => {
		mockPlausibleEnabled = false;

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();
	});

	it('should NOT track if tracker is not initialized', async () => {
		const { trackEvent } = await import('$lib/services/analytics.services');

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();
	});

	it('should handle initialization errors gracefully', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mockLoadTracker = () => {
			throw new Error('Load failed');
		};

		const { initPlausibleAnalytics, trackEvent } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});

	it('should handle init() throwing error', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const failingInitMock = vi.fn(() => {
			throw new Error('Init failed');
		});

		mockLoadTracker = () => ({ init: failingInitMock, track: trackMock });

		const { initPlausibleAnalytics, trackEvent } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});

	it('should not throw when tracker.track throws', async () => {
		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackMock.mockImplementationOnce(() => {
			throw new Error('Track failed');
		});

		expect(() =>
			trackEvent({
				name: 'test_event',
				metadata: { key: 'value' }
			})
		).not.toThrow();
	});

	it('should console.debug the error in LOCAL when tracker.track throws', async () => {
		mockLocal = true;

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		const trackError = new Error('Track failed');
		trackMock.mockImplementationOnce(() => {
			throw trackError;
		});

		const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).toHaveBeenCalled();
		expect(consoleDebugSpy).toHaveBeenCalledWith('[analytics]', trackError);

		consoleDebugSpy.mockRestore();
	});

	describe('trackActivityFilter', () => {
		it('emits an activity_filter event with the activity context, key, value and action', async () => {
			const { trackActivityFilter, initPlausibleAnalytics } =
				await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_EVENTS_KEYS, PLAUSIBLE_EVENT_FILTER_ACTIONS } =
				await import('$lib/enums/plausible');

			await initPlausibleAnalytics();

			trackActivityFilter({
				key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
				value: 'BTC-bitcoin',
				action: PLAUSIBLE_EVENT_FILTER_ACTIONS.ADD
			});

			expect(trackMock).toHaveBeenCalledWith('activity_filter', {
				props: {
					event_context: 'activity',
					event_key: 'token',
					event_value: 'BTC-bitcoin',
					event_action: 'add'
				}
			});
		});

		it('omits event_value and event_action when not provided', async () => {
			const { trackActivityFilter, initPlausibleAnalytics } =
				await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_EVENTS_KEYS } = await import('$lib/enums/plausible');

			await initPlausibleAnalytics();

			trackActivityFilter({ key: PLAUSIBLE_EVENT_EVENTS_KEYS.CLEAR });

			expect(trackMock).toHaveBeenCalledWith('activity_filter', {
				props: {
					event_context: 'activity',
					event_key: 'clear'
				}
			});
		});
	});

	it('should console.debug the error in STAGING when tracker.track throws', async () => {
		mockStaging = true;

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		const trackError = new Error('Track failed');
		trackMock.mockImplementationOnce(() => {
			throw trackError;
		});

		const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).toHaveBeenCalled();
		expect(consoleDebugSpy).toHaveBeenCalledWith('[analytics]', trackError);

		consoleDebugSpy.mockRestore();
	});

	it('should not console.debug when tracker.track throws in production', async () => {
		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackMock.mockImplementationOnce(() => {
			throw new Error('Track failed');
		});

		const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(consoleDebugSpy).not.toHaveBeenCalled();

		consoleDebugSpy.mockRestore();
	});
});
