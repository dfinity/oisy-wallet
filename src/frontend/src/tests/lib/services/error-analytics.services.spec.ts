import { trackEvent } from '$lib/services/analytics.services';
import {
	trackProfileDecodeFailed,
	trackUnmappedNetworkSettingsKey
} from '$lib/services/error-analytics.services';

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

	describe('trackProfileDecodeFailed', () => {
		it('tracks the field hash as a blocker', () => {
			trackProfileDecodeFailed({ fieldHash: '400215630' });

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'error',
				metadata: {
					event_context: 'backend',
					event_subcontext: 'profile_decode_failed',
					result_error_code: '400215630',
					result_error_severity: 'blocker'
				}
			});
		});

		// We cannot name the field, so the event must not pretend otherwise.
		it('omits the event key and value rather than guessing the network', () => {
			trackProfileDecodeFailed({ fieldHash: '400215630' });

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			expect(metadata).not.toHaveProperty('event_key');
			expect(metadata).not.toHaveProperty('event_value');
		});
	});
});
