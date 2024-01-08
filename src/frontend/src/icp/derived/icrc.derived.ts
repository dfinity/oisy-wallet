import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcToken } from '$icp/types/ic';
import { derived, type Readable } from 'svelte/store';

export const icrcTokens: Readable<IcToken[]> = derived(
	[icrcTokensStore],
	([$icrcTokensStore]) => $icrcTokensStore ?? []
);
