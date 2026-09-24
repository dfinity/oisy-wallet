import { trackEvent } from '$lib/services/analytics.services';
import { trackUnmappedNetworkSettingsKey } from '$lib/services/error-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('error-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackUnmappedNetworkSettingsKey', () => {
		it('tracks the unmapped key as a minor error', () => {
			trackUnmappedNetworkSettingsKey({ key: 'XrpMainnet' });

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'error',
				metadata: {
					event_context: 'networks',
					event_subcontext: 'settings_key_unmapped',
					event_key: 'network',
					event_value: 'XrpMainnet',
					result_error_severity: 'minor'
				}
			});
		});

		// The key is a candid variant name, i.e. public chain vocabulary — never user data.
		it('carries no property beyond the documented set', () => {
			trackUnmappedNetworkSettingsKey({ key: 'XrpMainnet' });

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			expect(Object.keys(metadata ?? {}).sort()).toEqual([
				'event_context',
				'event_key',
				'event_subcontext',
				'event_value',
				'result_error_severity'
			]);
		});
	});
});
