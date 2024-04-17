import {
	CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	CKETH_LEDGER_CANISTER_TESTNET_IDS
} from '$env/networks.ircrc.env';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic';
import { testnets } from '$lib/derived/testnets.derived';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const icrcDefaultTokens: Readable<IcToken[]> = derived(
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

export const icrcTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokens, icrcCustomTokensStore],
	([$icrcDefaultTokens, $icrcCustomTokensStore]) => [
		...$icrcDefaultTokens,
		...($icrcCustomTokensStore?.map(({ data: token }) => token) ?? []).filter(
			({ enabled }) => enabled
		)
	]
);

export const icrcLedgerCanisterIds: Readable<LedgerCanisterIdText[]> = derived(
	[icrcTokens],
	([$icrcTokens]) => $icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId)
);

export const sortedIcrcTokens: Readable<IcToken[]> = derived([icrcTokens], ([$icrcTokens]) =>
	$icrcTokens.sort(
		(
			{ name: nameA, position: positionA, exchangeCoinId: exchangeCoinIdA },
			{ name: nameB, position: positionB, exchangeCoinId: exchangeCoinIdB }
		) =>
			positionA === positionB
				? exchangeCoinIdA === exchangeCoinIdB ||
					isNullish(exchangeCoinIdA) ||
					isNullish(exchangeCoinIdB)
					? nameA.localeCompare(nameB)
					: exchangeCoinIdA.localeCompare(exchangeCoinIdB)
				: positionA - positionB
	)
);
