import { i18n } from '$lib/stores/i18n.store';
import { privacyModeStore } from '$lib/stores/settings.store';
import { toastsShow } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

interface SetPrivacyModeOptions {
	enabled: boolean;
	withToast?: boolean;
}

export const setPrivacyMode = ({ enabled, withToast = false }: SetPrivacyModeOptions): void => {
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
