import { TRACK_PRIVACY_MODE_CHANGE } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { privacyModeStore } from '$lib/stores/settings.store';
import { toastsShow } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

interface SetPrivacyModeOptions {
	enabled: boolean;
	source?: string;
	withToast?: boolean;
}

export const setPrivacyMode = ({
	enabled,
	withToast = false,
	source
}: SetPrivacyModeOptions): void => {
	trackEvent({
		name: TRACK_PRIVACY_MODE_CHANGE,
		metadata: {
			enabled: String(enabled),
			source: `${source}`,
			withToast: withToast ? 'With toast message' : 'Without toast message'
		}
	});

	privacyModeStore.set({
		key: 'privacy-mode',
		value: { enabled }
	});

	if (withToast) {
		const $i18n = get(i18n);
		toastsShow({
			text: enabled
				? $i18n.navigation.text.privacy_mode_enabled
				: $i18n.navigation.text.privacy_mode_disabled,
			level: 'info',
			duration: 7000
		});
	}
};
