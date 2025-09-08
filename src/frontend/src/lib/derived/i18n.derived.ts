import type { Languages } from '$lib/enums/languages';
import { i18n } from '$lib/stores/i18n.store';
import { derived, type Readable } from 'svelte/store';

export const currentLanguage: Readable<Languages> = derived([i18n], ([{ lang }]) => lang);
