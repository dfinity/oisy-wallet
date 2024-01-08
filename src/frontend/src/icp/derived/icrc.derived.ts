import { derived, type Readable } from 'svelte/store';
import { icrcTokensStore } from '../stores/icrc.store';
import type { IcToken } from '../types/ic';

export const icrcTokens: Readable<IcToken[]> = derived(
	[icrcTokensStore],
	([$icrcTokensStore]) => $icrcTokensStore ?? []
);
