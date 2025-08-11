import { TRACK_PRIVACY_MODE_CHANGE } from '$lib/constants/analytics.contants';
import * as analytics from '$lib/services/analytics.services';
import { privacyModeStore } from '$lib/stores/settings.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import type { MockInstance } from 'vitest';

describe('setPrivacyMode', () => {
	let spyToastsShow: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
	});

	it('should enable privacy mode without toast', () => {
		const spyStoreSet = vi.spyOn(privacyModeStore, 'set');

		setPrivacyMode({ enabled: true });

		expect(spyStoreSet).toHaveBeenCalledWith({
			key: 'privacy-mode',
			value: { enabled: true }
		});
		expect(spyToastsShow).not.toHaveBeenCalled();
	});

	it('should disable privacy mode without toast', () => {
		const spyStoreSet = vi.spyOn(privacyModeStore, 'set');

		setPrivacyMode({ enabled: false });

		expect(spyStoreSet).toHaveBeenCalledWith({
			key: 'privacy-mode',
			value: { enabled: false }
		});
		expect(spyToastsShow).not.toHaveBeenCalled();
	});

	it('should enable privacy mode and show toast', () => {
		setPrivacyMode({ enabled: true, withToast: true });

		expect(spyToastsShow).toHaveBeenCalledWith({
			text: en.navigation.text.privacy_mode_enabled,
			level: 'info',
			duration: 7000
		});
	});

	it('should disable privacy mode and show toast', () => {
		setPrivacyMode({ enabled: false, withToast: true });

		expect(spyToastsShow).toHaveBeenCalledWith({
			text: en.navigation.text.privacy_mode_disabled,
			level: 'info',
			duration: 7000
		});
	});

	it('should track event when enabling privacy mode with source', () => {
		const spyTrackEvent = vi.spyOn(analytics, 'trackEvent');

		setPrivacyMode({ enabled: true, source: 'User menu click' });

		expect(spyTrackEvent).toHaveBeenCalledOnce();
		expect(spyTrackEvent).toHaveBeenCalledWith({
			name: TRACK_PRIVACY_MODE_CHANGE,
			metadata: {
				enabled: 'true',
				source: 'User menu click',
				withToast: 'Without toast message'
			}
		});
	});

	it('should track event when disabling privacy mode with toast and source', () => {
		const spyTrackEvent = vi.spyOn(analytics, 'trackEvent');

		setPrivacyMode({ enabled: false, withToast: true, source: 'keypress P' });

		expect(spyTrackEvent).toHaveBeenCalledOnce();
		expect(spyTrackEvent).toHaveBeenCalledWith({
			name: TRACK_PRIVACY_MODE_CHANGE,
			metadata: {
				enabled: 'false',
				source: 'keypress P',
				withToast: 'With toast message'
			}
		});
	});
});
