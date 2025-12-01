const trackMock = vi.fn();
const initMock = vi.fn();

vi.mock('$lib/services/analytics-wrapper', () => ({
	loadPlausibleTracker: vi.fn(() => ({
		init: initMock,
		track: trackMock
	}))
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$env/plausible.env', () => ({
	PLAUSIBLE_ENABLED: true,
	PLAUSIBLE_DOMAIN: 'test.com'
}));

describe('plausible analytics service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		vi.doMock('$app/environment', () => ({
			browser: false
		}));

		vi.resetModules();

		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		expect(initMock).not.toHaveBeenCalled();
	});

	it('should NOT track if not initialized', async () => {
		vi.doMock('$env/plausible.env', () => ({
			PLAUSIBLE_ENABLED: true,
			PLAUSIBLE_DOMAIN: null
		}));

		vi.resetModules();

		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();
	});

	it('should NOT initialize if PLAUSIBLE_ENABLED is false', async () => {
		vi.doMock('$env/plausible.env', () => ({
			PLAUSIBLE_ENABLED: false,
			PLAUSIBLE_DOMAIN: 'test.com'
		}));

		vi.resetModules();

		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		expect(initMock).not.toHaveBeenCalled();
	});

	it('should NOT track if PLAUSIBLE_ENABLED is false', async () => {
		vi.doMock('$env/plausible.env', () => ({
			PLAUSIBLE_ENABLED: false,
			PLAUSIBLE_DOMAIN: 'test.com'
		}));

		vi.resetModules();

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

		vi.doMock('$lib/services/analytics-wrapper', () => ({
			loadPlausibleTracker: vi.fn(() => {
				throw new Error('Load failed');
			})
		}));

		vi.resetModules();

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

		vi.doMock('$lib/services/analytics-wrapper', () => ({
			loadPlausibleTracker: vi.fn(() => ({
				init: failingInitMock,
				track: trackMock
			}))
		}));

		vi.resetModules();

		const { initPlausibleAnalytics, trackEvent } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		trackEvent({
			name: 'test_event',
			metadata: { key: 'value' }
		});

		expect(trackMock).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});
});
