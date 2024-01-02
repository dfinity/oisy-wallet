import { icrcTokensStore } from '$lib/stores/icrc.store';
import type { IcToken } from '$lib/types/ic';
import { derived, type Readable } from 'svelte/store';

export const icrcTokens: Readable<IcToken[]> = derived(
	[icrcTokensStore],
	([$icrcTokensStore]) => $icrcTokensStore ?? []
);
