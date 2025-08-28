import { Languages } from '$lib/enums/languages';

export const SUPPORTED_LANGUAGES = Object.entries(Languages);

// This is the label that is shown. We don't need to translate it as we always show it in its own language
export const LANGUAGES = {
	[Languages.ENGLISH]: 'English',
	[Languages.CZECH]: 'Čeština',
	[Languages.FRENCH]: 'Français',
	[Languages.GERMAN]: 'Deutsch',
	[Languages.ITALIAN]: 'Italiano',
	[Languages.JAPANESE]: '日本語',
	[Languages.PORTUGUESE]: 'Português',
	[Languages.VIETNAMESE]: 'Tiếng việt',
	[Languages.CHINESE_SIMPLIFIED]: '中文 (简体)'
};
