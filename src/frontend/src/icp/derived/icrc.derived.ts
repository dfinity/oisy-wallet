import {
	CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	CKETH_LEDGER_CANISTER_TESTNET_IDS
} from '$env/networks.ircrc.env';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcToken } from '$icp/types/ic';
import { testnets } from '$lib/derived/testnets.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const icrcTokens: Readable<IcToken[]> = derived(
	[icrcTokensStore, testnets],
	([$icrcTokensStore, $testnets]) =>
		($icrcTokensStore?.map(({ data: token }) => token) ?? []).filter(
			({ ledgerCanisterId }) =>
				$testnets ||
				![...CKBTC_LEDGER_CANISTER_TESTNET_IDS, ...CKETH_LEDGER_CANISTER_TESTNET_IDS].includes(
					ledgerCanisterId
				)
		)
);

export const sortedIcrcTokens: Readable<Token[]> = derived([icrcTokens], ([$icrcTokens]) =>
	$icrcTokens.sort(
		(
			{ name: nameA, position: positionA, exchangeCoinId: exchangeCoinIdA },
			{ name: nameB, position: positionB, exchangeCoinId: exchangeCoinIdB }
		) =>
			positionA === positionB
				? exchangeCoinIdA === exchangeCoinIdB
					? nameA.localeCompare(nameB)
					: exchangeCoinIdA.localeCompare(exchangeCoinIdB)
				: positionA - positionB
	)
);
