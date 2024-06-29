import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcToken } from '$icp/types/ic';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { testnets } from '$lib/derived/testnets.derived';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of Icrc default tokens - i.e. the statically configured Icrc tokens of Oisy + their metadata, unique ids etc. fetched at runtime.
 */
export const icrcDefaultTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokensStore, testnets],
	([$icrcTokensStore, $testnets]) =>
		($icrcTokensStore?.map(({ data: token }) => token) ?? []).filter(
			(token) => $testnets || !isTokenIcrcTestnet(token)
		)
);

/**
 * The list of Icrc tokens the user has added, enabled or disabled. Can contains default tokens for example if user has disabled a default tokens.
 * i.e. default tokens are configured on the client side. If user disable or enable a default tokens, this token is added as a "custom token" in the backend.
 */
export const icrcCustomTokens: Readable<IcrcCustomToken[]> = derived(
	[icrcCustomTokensStore],
	([$icrcCustomTokensStore]) => $icrcCustomTokensStore?.map(({ data: token }) => token) ?? []
);

const icrcCustomTokensEnabled: Readable<IcrcCustomToken[]> = derived(
	[icrcCustomTokens],
	([$icrcCustomTokens]) => $icrcCustomTokens.filter(({ enabled }) => enabled)
);

export const icrcTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokens, icrcCustomTokensEnabled],
	([$icrcDefaultTokens, $icrcCustomTokensEnabled]) => [
		...$icrcDefaultTokens,
		...$icrcCustomTokensEnabled
	]
);

export const sortedIcrcTokens: Readable<IcToken[]> = derived([icrcTokens], ([$icrcTokens]) =>
	$icrcTokens.sort(sortIcTokens)
);
