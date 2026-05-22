import { icPunksCustomTokensStore } from '$icp/stores/icpunks-custom-tokens.store';
import { icPunksDefaultTokensStore } from '$icp/stores/icpunks-default-tokens.store';
import type { IcPunksCustomToken } from '$icp/types/icpunks-custom-token';
import type { IcPunksToken } from '$icp/types/icpunks-token';
import type { CanisterIdText } from '$lib/types/canister';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

const icPunksDefaultTokens: Readable<IcPunksToken[]> = derived(
	[icPunksDefaultTokensStore],
	([$icPunksTokensStore]) => $icPunksTokensStore ?? []
);

const icPunksDefaultTokensCanisterIds: Readable<CanisterIdText[]> = derived(
	[icPunksDefaultTokens],
	([$icPunksDefaultTokens]) => $icPunksDefaultTokens.map(({ canisterId }) => canisterId)
);

export const icPunksCustomTokens: Readable<IcPunksCustomToken[]> = derived(
	[icPunksCustomTokensStore],
	([$icPunksCustomTokensStore]) => $icPunksCustomTokensStore?.map(({ data: token }) => token) ?? []
);

const icPunksDefaultTokensToggleable: Readable<IcPunksCustomToken[]> = derived(
	[icPunksDefaultTokens, icPunksCustomTokens],
	([$icPunksDefaultTokens, $icPunksCustomTokens]) => {
		const customTokenByCanisterId = new Map(
			$icPunksCustomTokens.map((token) => [token.canisterId, token])
		);

		return $icPunksDefaultTokens.map(({ canisterId, ...rest }) =>
			mapDefaultTokenToToggleable<IcPunksToken>({
				defaultToken: { canisterId, ...rest },
				customToken: customTokenByCanisterId.get(canisterId)
			})
		);
	}
);

const icPunksCustomTokensToggleable: Readable<IcPunksCustomToken[]> = derived(
	[icPunksCustomTokens, icPunksDefaultTokensCanisterIds],
	([$icPunksCustomTokens, $icPunksDefaultTokensCanisterIds]) => {
		const defaultCanisterIds = new Set($icPunksDefaultTokensCanisterIds);

		return $icPunksCustomTokens.filter(({ canisterId }) => !defaultCanisterIds.has(canisterId));
	}
);

export const icPunksTokens: Readable<IcPunksCustomToken[]> = derived(
	[icPunksDefaultTokensToggleable, icPunksCustomTokensToggleable],
	([$icPunksDefaultTokensToggleable, $icPunksCustomTokensToggleable]) => [
		...$icPunksDefaultTokensToggleable,
		...$icPunksCustomTokensToggleable
	]
);

const icPunksCustomTokensInitialized: Readable<boolean> = derived(
	[icPunksCustomTokensStore],
	([$icPunksCustomTokensStore]) => $icPunksCustomTokensStore !== undefined
);

export const icPunksCustomTokensNotInitialized: Readable<boolean> = derived(
	[icPunksCustomTokensInitialized],
	([$icPunksCustomTokensInitialized]) => !$icPunksCustomTokensInitialized
);
