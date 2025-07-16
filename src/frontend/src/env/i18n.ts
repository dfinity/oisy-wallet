import { Languages } from '$lib/types/languages';

export const SUPPORTED_LANGUAGES = Object.entries(Languages);

// This is the label that is shown. We don't need to translate it as we always show it in its own language
export const LANGUAGES = {
	[Languages.ENGLISH]: 'English',
	[Languages.GERMAN]: 'Deutsch',
	[Languages.ITALIAN]: 'Italiano',
	[Languages.PORTUGUESE]: 'Português',
	[Languages.CHINESE_SIMPLIFIED]: '中文 (简体)'
};
