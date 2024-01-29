import type { IcToken } from '$icp/types/ic';
import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { token, tokenStandard } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

/**
 * ETH to ckETH is supported:
 * - on network Ethereum if the token is Ethereum (and not some ERC20 token)
 * - on network ICP if the token is ckETH
 */
export const ethToCkETHEnabled: Readable<boolean> = derived(
	[tokenStandard, token],
	([$tokenStandard, $token]) =>
		$tokenStandard === 'ethereum' || isTokenCkEthLedger($token as IcToken)
);
