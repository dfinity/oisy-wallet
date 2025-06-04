import { icrcTokens } from '$icp/derived/icrc.derived';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { token } from '$lib/stores/token.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * Ethereum fees for converting ckErc20 in ckEth are paid in ckEth.
 */
export const ethereumFeeTokenCkEth: Readable<IcToken | undefined> = derived(
	[token, icrcTokens],
	([$token, $icrcTokens]) => {
		if (isNullish($token)) {
			return undefined;
		}

		// In case the token is already ckEth, we don't need to look for the fee ledger.
		// The Ethereum fees are paid burning ckEth, that is the same token as the one in question.
		if (isTokenCkEthLedger($token)) {
			return $token as IcToken;
		}

		const { feeLedgerCanisterId } = $token as IcCkToken;
		return nonNullish(feeLedgerCanisterId)
			? $icrcTokens.find(({ ledgerCanisterId }) => ledgerCanisterId === feeLedgerCanisterId)
			: undefined;
	}
);
