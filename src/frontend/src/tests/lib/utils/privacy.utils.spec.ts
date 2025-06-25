import { privacyModeStore } from '$lib/stores/settings.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { vi, type MockInstance } from 'vitest';

vi.mock('$lib/stores/i18n.store', () => ({
	i18n: {
		subscribe: (
			fn: (value: {
				navigation: {
					text: {
						privacy_mode_enabled: string;
						privacy_mode_disabled: string;
					};
				};
			}) => void
		) => {
			fn({
				navigation: {
					text: {
						privacy_mode_enabled: 'Privacy mode enabled',
						privacy_mode_disabled: 'Privacy mode disabled'
					}
				}
			});
			return () => {};
		}
	}
}));

describe('privacy.utils', () => {
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
			text: 'Privacy mode enabled',
			level: 'info',
			duration: 7000
		});
	});

	it('should disable privacy mode and show toast', () => {
		setPrivacyMode({ enabled: false, withToast: true });

		expect(spyToastsShow).toHaveBeenCalledWith({
			text: 'Privacy mode disabled',
			level: 'info',
			duration: 7000
		});
	});
});
