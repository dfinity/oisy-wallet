import { icrc7CustomTokensStore } from '$icp/stores/icrc7-custom-tokens.store';
import { icrc7DefaultTokensStore } from '$icp/stores/icrc7-default-tokens.store';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import type { Icrc7Token } from '$icp/types/icrc7-token';
import type { CanisterIdText } from '$lib/types/canister';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

const icrc7DefaultTokens: Readable<Icrc7Token[]> = derived(
	[icrc7DefaultTokensStore],
	([$icrc7TokensStore]) => $icrc7TokensStore ?? []
);

const icrc7DefaultTokensCanisterIds: Readable<CanisterIdText[]> = derived(
	[icrc7DefaultTokens],
	([$icrc7DefaultTokens]) => $icrc7DefaultTokens.map(({ canisterId }) => canisterId)
);

export const icrc7CustomTokens: Readable<Icrc7CustomToken[]> = derived(
	[icrc7CustomTokensStore],
	([$icrc7CustomTokensStore]) => $icrc7CustomTokensStore?.map(({ data: token }) => token) ?? []
);

const icrc7DefaultTokensToggleable: Readable<Icrc7CustomToken[]> = derived(
	[icrc7DefaultTokens, icrc7CustomTokens],
	([$icrc7DefaultTokens, $icrc7CustomTokens]) =>
		$icrc7DefaultTokens.map(({ canisterId, ...rest }) => {
			const customToken = $icrc7CustomTokens.find(
				({ canisterId: canisterIdCustomToken }) => canisterIdCustomToken === canisterId
			);

			return mapDefaultTokenToToggleable<Icrc7Token>({
				defaultToken: { canisterId, ...rest },
				customToken
			});
		})
);

const icrc7CustomTokensToggleable: Readable<Icrc7CustomToken[]> = derived(
	[icrc7CustomTokens, icrc7DefaultTokensCanisterIds],
	([$icrc7CustomTokens, $icrc7DefaultTokensCanisterIds]) =>
		$icrc7CustomTokens.filter(
			({ canisterId }) => !$icrc7DefaultTokensCanisterIds.includes(canisterId)
		)
);

export const icrc7Tokens: Readable<Icrc7CustomToken[]> = derived(
	[icrc7DefaultTokensToggleable, icrc7CustomTokensToggleable],
	([$icrc7DefaultTokensToggleable, $icrc7CustomTokensToggleable]) => [
		...$icrc7DefaultTokensToggleable,
		...$icrc7CustomTokensToggleable
	]
);

const icrc7CustomTokensInitialized: Readable<boolean> = derived(
	[icrc7CustomTokensStore],
	([$icrc7CustomTokensStore]) => $icrc7CustomTokensStore !== undefined
);

export const icrc7CustomTokensNotInitialized: Readable<boolean> = derived(
	[icrc7CustomTokensInitialized],
	([$icrc7CustomTokensInitialized]) => !$icrc7CustomTokensInitialized
);
