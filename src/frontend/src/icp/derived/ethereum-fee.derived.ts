import { icrcTokens } from '$icp/derived/icrc.derived';
import type { IcCkToken, IcToken } from '$icp/types/ic';
import { token } from '$lib/derived/token.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * Ethereum fees for converting ckErc20 in ckEth are paid in ckEth.
 */
export const ethereumFeeTokenCkEth: Readable<IcToken | undefined> = derived(
	[token, icrcTokens],
	([$token, $icrcTokens]) => {
		const feeLedgerCanisterId = ($token as IcCkToken).feeLedgerCanisterId;
		return nonNullish(feeLedgerCanisterId)
			? $icrcTokens.find(({ ledgerCanisterId }) => ledgerCanisterId === feeLedgerCanisterId)
			: undefined;
	}
);
