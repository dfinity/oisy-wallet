import {
	CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	CKETH_LEDGER_CANISTER_TESTNET_IDS,
	CKUSDC_LEDGER_CANISTER_TESTNET_IDS
} from '$env/networks.ircrc.env';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcToken } from '$icp/types/ic';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { testnets } from '$lib/derived/testnets.derived';
import { derived, type Readable } from 'svelte/store';

// TODO: rename me enabledIcrcTokens
export const icrcDefaultTokens: Readable<IcToken[]> = derived(
	[icrcTokensStore, testnets],
	([$icrcTokensStore, $testnets]) =>
		($icrcTokensStore?.map(({ data: token }) => token) ?? []).filter(
			({ ledgerCanisterId }) =>
				$testnets ||
				![
					...CKBTC_LEDGER_CANISTER_TESTNET_IDS,
					...CKETH_LEDGER_CANISTER_TESTNET_IDS,
					...CKUSDC_LEDGER_CANISTER_TESTNET_IDS
				].includes(ledgerCanisterId)
		)
);

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
