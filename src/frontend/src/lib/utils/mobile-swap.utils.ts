import { isMobileSendToken } from '$icp/utils/ic-send.utils';
import { SwapProvider } from '$lib/types/swap';
import type { OptionToken } from '$lib/types/token';

// Mobile Swap shares Send's canonical ICP/ck-ledger allowlist. Neither a
// matching ticker nor the ICRC standard opts a custom token into mobile swaps.
export const isMobileSwapPair = ({
	sourceToken,
	destinationToken
}: {
	sourceToken: OptionToken;
	destinationToken: OptionToken;
}): boolean =>
	isMobileSendToken(sourceToken) &&
	isMobileSendToken(destinationToken) &&
	sourceToken.id !== destinationToken.id &&
	sourceToken.ledgerCanisterId !== destinationToken.ledgerCanisterId;

export const isMobileSwapProvider = (provider: SwapProvider): boolean =>
	provider === SwapProvider.ICP_SWAP;
