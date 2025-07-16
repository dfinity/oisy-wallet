import { i18n } from '$lib/stores/i18n.store';
import type { Languages } from '$lib/types/languages';
import { derived, type Readable } from 'svelte/store';

export const currentLanguage: Readable<Languages> = derived([i18n], ([{ lang }]) => lang);
