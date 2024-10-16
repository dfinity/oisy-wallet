import type { IcToken } from '$icp/types/ic';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { token } from '$lib/stores/token.store';
import { derived, type Readable } from 'svelte/store';

export const tokenAsIcToken: Readable<IcToken> = derived([token], ([$token]) => $token as IcToken);

export const tokenWithFallbackAsIcToken: Readable<IcToken> = derived(
	[tokenWithFallback],
	([$token]) => $token as IcToken
);

export const tokenCkBtcLedger: Readable<boolean> = derived([tokenAsIcToken], ([$token]) =>
	isTokenCkBtcLedger($token)
);

export const tokenCkEthLedger: Readable<boolean> = derived([tokenAsIcToken], ([$token]) =>
	isTokenCkEthLedger($token)
);

export const tokenCkErc20Ledger: Readable<boolean> = derived([tokenAsIcToken], ([$token]) =>
	isTokenCkErc20Ledger($token)
);
