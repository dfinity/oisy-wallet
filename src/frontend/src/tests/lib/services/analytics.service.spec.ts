import type { TrackEventParams } from '$lib/types/analytics';
import Plausible from 'plausible-tracker';

const trackEventMock = vi.fn();
const enableAutoPageviews = vi.fn();

vi.mock('plausible-tracker', () => ({
	default: vi.fn(() => ({
		enableAutoPageviews,
		trackEvent: trackEventMock
	}))
}));

vi.doMock('$lib/constants/app.constants', () => ({
	PROD: true
}));

vi.doMock('$env/plausible.env', () => ({
	PLAUSIBLE_ENABLED: true,
	PLAUSIBLE_DOMAIN: 'test.com'
}));

describe('plausible analytics service', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('should initialize Plausible with correct config', async () => {
		const { PLAUSIBLE_DOMAIN } = await import('$env/plausible.env');
		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		initPlausibleAnalytics();

		expect(Plausible).toHaveBeenCalledWith({
			domain: PLAUSIBLE_DOMAIN,
			hashMode: false,
			trackLocalhost: false
		});

		expect(console.warn).not.toHaveBeenCalledWith('Warning message');
	});

	it('should call console.warn if value is provided', async () => {
		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		initPlausibleAnalytics();

		const params: TrackEventParams = {
			name: 'test_event_name',
			metadata: { eventName: 'eventValue' },
			warning: 'Warning message'
		};

		trackEvent(params);

		expect(trackEventMock).toHaveBeenCalledWith('test_event_name', {
			props: { eventName: 'eventValue' }
		});

		expect(console.warn).toHaveBeenCalledWith('Warning message');
	});

	it('should enable auto pageviews', async () => {
		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		expect(enableAutoPageviews).toHaveBeenCalledTimes(0);

		initPlausibleAnalytics();

		expect(enableAutoPageviews).toHaveBeenCalledOnce();
	});

	it('should call trackEvent if tracker is initialized', async () => {
		const { trackEvent, initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		initPlausibleAnalytics();

		const params: TrackEventParams = {
			name: 'test_event_name',
			metadata: { eventName: 'eventValue' }
		};

		trackEvent(params);

		expect(trackEventMock).toHaveBeenCalledWith('test_event_name', {
			props: { eventName: 'eventValue' }
		});
	});

	it('should NOT call trackEvent or init anything if PLAUSIBLE_ENABLED is false', async () => {
		vi.doMock('$env/plausible.env', () => ({
			PLAUSIBLE_ENABLED: false
		}));

		const { initPlausibleAnalytics, trackEvent } = await import('$lib/services/analytics.services');

		initPlausibleAnalytics();

		expect(Plausible).not.toHaveBeenCalled();
		expect(enableAutoPageviews).not.toHaveBeenCalled();

		const params: TrackEventParams = {
			name: 'test_event_name',
			metadata: { eventName: 'eventValue' }
		};

		trackEvent(params);

		expect(trackEventMock).not.toHaveBeenCalled();
	});

	it('should catch and log errors if Plausible initialization fails', async () => {
		vi.doMock('$env/plausible.env', () => ({
			PLAUSIBLE_ENABLED: true,
			PLAUSIBLE_DOMAIN: 'oisy.com'
		}));

		vi.mocked(Plausible).mockImplementation(() => {
			throw new Error();
		});

		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		initPlausibleAnalytics();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'An unexpected error occurred during initialization.'
		);

		consoleWarnSpy.mockRestore();
	});
});
