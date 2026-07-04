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
			domain: 'test.com',
			transformRequest: expect.any(Function)
		});
	});

	it('should strip URL fragments before sending Plausible payloads', async () => {
		const { initPlausibleAnalytics } = await import('$lib/services/analytics.services');

		await initPlausibleAnalytics();

		const [[{ transformRequest }]] = initMock.mock.calls;

		expect(
			transformRequest({
				n: 'pageview',
				u: 'https://oisy.com/notes/share/token?k=v#k=SECRET',
				d: 'oisy.com',
				r: 'https://example.com/from',
				p: { key: 'value' },
				i: false
			})
		).toEqual({
			n: 'pageview',
			u: 'https://oisy.com/notes/share/token?k=v',
			d: 'oisy.com',
			r: 'https://example.com/from',
			p: { key: 'value' },
			i: false
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

	describe('trackTransactionFilter', () => {
		it('emits a transaction_filter event with modifier, key, value, source_location and result_status for the transaction-type filter', async () => {
			const { trackTransactionFilter, initPlausibleAnalytics } =
				await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_EVENTS_KEYS, PLAUSIBLE_EVENT_FILTER_MODIFIERS } =
				await import('$lib/enums/plausible');

			await initPlausibleAnalytics();

			trackTransactionFilter({
				modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS.SET,
				key: PLAUSIBLE_EVENT_EVENTS_KEYS.TRANSACTION_TYPE,
				value: 'send'
			});

			expect(trackMock).toHaveBeenCalledWith('transaction_filter', {
				props: {
					event_modifier: 'set',
					event_key: 'transaction_type',
					event_value: 'send',
					source_location: 'activity_page',
					result_status: 'success'
				}
			});
		});

		it('emits dedicated token_* fields instead of event_value when filtering by token', async () => {
			const { trackTransactionFilter, initPlausibleAnalytics } =
				await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_EVENTS_KEYS, PLAUSIBLE_EVENT_FILTER_MODIFIERS } =
				await import('$lib/enums/plausible');

			await initPlausibleAnalytics();

			trackTransactionFilter({
				modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS.SET,
				key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
				token: {
					network: 'eth',
					address: '0x0000000000000000000000000000000000000000',
					symbol: 'ETH',
					name: 'Ethereum'
				}
			});

			expect(trackMock).toHaveBeenCalledWith('transaction_filter', {
				props: {
					event_modifier: 'set',
					event_key: 'token',
					token_network: 'eth',
					token_address: '0x0000000000000000000000000000000000000000',
					token_symbol: 'ETH',
					token_name: 'Ethereum',
					source_location: 'activity_page',
					result_status: 'success'
				}
			});
		});

		it('omits event_key and value when modifier is clear', async () => {
			const { trackTransactionFilter, initPlausibleAnalytics } =
				await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_FILTER_MODIFIERS } = await import('$lib/enums/plausible');

			await initPlausibleAnalytics();

			trackTransactionFilter({ modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS.CLEAR });

			expect(trackMock).toHaveBeenCalledWith('transaction_filter', {
				props: {
					event_modifier: 'clear',
					source_location: 'activity_page',
					result_status: 'success'
				}
			});
		});
	});

	describe('buildLearnMoreEvent', () => {
		it('returns the open_documentation payload without source_sublocation when omitted', async () => {
			const { buildLearnMoreEvent } = await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } = await import('$lib/enums/plausible');

			const result = buildLearnMoreEvent({
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.LOCK,
				labelKey: 'lock.text.learn_more',
				url: 'https://docs.oisy.com/locking'
			});

			expect(result).toEqual({
				name: 'open_documentation',
				metadata: {
					event_context: 'learn_more',
					event_key: 'link',
					event_value: 'https://docs.oisy.com/locking',
					source_location: 'lock',
					source_path: 'lock / Learn more'
				}
			});
		});

		it('includes source_sublocation in the payload when provided', async () => {
			const { buildLearnMoreEvent } = await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } = await import('$lib/enums/plausible');

			const result = buildLearnMoreEvent({
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SCANNER,
				sourceSublocation: 'scan',
				labelKey: 'scanner.text.learn_more_about_scan',
				url: 'https://docs.oisy.com/scan'
			});

			expect(result).toEqual({
				name: 'open_documentation',
				metadata: {
					event_context: 'learn_more',
					event_key: 'link',
					event_value: 'https://docs.oisy.com/scan',
					source_location: 'scanner',
					source_sublocation: 'scan',
					source_path: 'scanner / scan / Learn more about the scanner'
				}
			});
		});

		it('pins the export_data variant under settings_page', async () => {
			const { buildLearnMoreEvent } = await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } = await import('$lib/enums/plausible');

			const result = buildLearnMoreEvent({
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
				sourceSublocation: 'export_data',
				labelKey: 'settings.text.learn_more',
				url: 'https://docs.oisy.com/export'
			});

			expect(result).toEqual({
				name: 'open_documentation',
				metadata: {
					event_context: 'learn_more',
					event_key: 'link',
					event_value: 'https://docs.oisy.com/export',
					source_location: 'settings_page',
					source_sublocation: 'export_data',
					source_path: 'settings_page / export_data / Learn more'
				}
			});
		});

		it('expands OISY placeholders in the source_path label (scanner pay)', async () => {
			const { buildLearnMoreEvent } = await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } = await import('$lib/enums/plausible');

			const result = buildLearnMoreEvent({
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SCANNER,
				sourceSublocation: 'pay',
				labelKey: 'scanner.text.learn_more_about_pay',
				url: 'https://docs.oisy.com/pay'
			});

			// `scanner.text.learn_more_about_pay` is "Learn more about $oisy_short Pay";
			// the helper must expand `$oisy_short` so the dashboard column reads cleanly.
			expect(result.metadata?.source_path).toBe('scanner / pay / Learn more about OISY Pay');
		});

		it('omits the label segment when the i18n key cannot be resolved', async () => {
			const { buildLearnMoreEvent } = await import('$lib/services/analytics.services');
			const { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } = await import('$lib/enums/plausible');

			const result = buildLearnMoreEvent({
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.LOCK,
				labelKey: 'nonexistent.key.path',
				url: 'https://example.com'
			});

			expect(result.metadata?.source_path).toBe('lock');
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
