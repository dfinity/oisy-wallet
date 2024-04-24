import type { IcToken } from '$icp/types/ic';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { token } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const tokenCkBtcLedger: Readable<boolean> = derived([token], ([$token]) =>
	isTokenCkBtcLedger($token as IcToken)
);

export const tokenCkEthLedger: Readable<boolean> = derived([token], ([$token]) =>
	isTokenCkEthLedger($token as IcToken)
);

export const tokenCkErc20Ledger: Readable<boolean> = derived([token], ([$token]) =>
	isTokenCkErc20Ledger($token as IcToken)
);
