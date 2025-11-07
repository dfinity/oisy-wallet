const trackMock = vi.fn();
const initMock = vi.fn();

vi.mock('$lib/services/analytics-wrapper', () => ({
	init: initMock,
	track: trackMock
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

	it('should call track', async () => {
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

	it('should NOT initialize if browser is false', async () => {
		vi.doMock('$app/environment', () => ({
			browser: false
		}));

		vi.resetModules();

		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		expect(initMock).not.toHaveBeenCalled();
	});
});
