import { icrcTokensStore } from '$lib/stores/icrc.store';
import type { IcrcToken } from '$lib/types/icrc';
import { derived, type Readable } from 'svelte/store';

export const icrcTokens: Readable<IcrcToken[]> = derived(
	[icrcTokensStore],
	([$icrcTokensStore]) => $icrcTokensStore ?? []
);
