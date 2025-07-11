import { Languages } from '$lib/types/languages';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const SUPPORTED_LANGUAGES = Object.entries(Languages);

// This is the label that is shown. We don't need to translate it as we always show it in its own language
export const LANGUAGES = {
	[Languages.ENGLISH]: 'English',
	[Languages.GERMAN]: 'Deutsch',
	[Languages.ITALIAN]: 'Italiano',
	[Languages.PORTUGUESE]: 'Português',
	[Languages.CHINESE_SIMPLIFIED]: '中文 (简体)'
};

// Enabled on Staging and Local if not set
// Todo: remove once the feature has been completed
export const I18N_ENABLED = parseBoolEnvVar(import.meta.env.VITE_I18N_ENABLED);
