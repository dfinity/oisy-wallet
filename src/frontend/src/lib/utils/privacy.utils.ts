import { privacyModeStore } from '$lib/stores/settings.store';

export const setPrivacyMode = (enabled: boolean): void => {
	privacyModeStore.set({
		key: 'privacy-mode',
		value: { enabled }
	});
};
