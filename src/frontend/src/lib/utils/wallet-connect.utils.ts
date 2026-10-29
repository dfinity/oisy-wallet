import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { CAIP10_CHAINS } from '$env/caip10-chains.env';
import { EIP155_CHAINS } from '$env/eip155-chains.env';
import type { Verify } from '@walletconnect/types';

/**
 * Whether a WalletConnect session proposal or request may be approved: not when WalletConnect's
 * Verify API flags the site it comes from as a scam.
 *
 * Verify states that verdict in `isScam` alone. `validation` only says whether the request came
 * from the domain the dApp claims, so a flagged site served from its own domain is still `VALID`.
 */
export const acceptedContext = (context: Verify.Context | undefined): boolean =>
	context?.verified.isScam !== true;

/**
 * The name of the network a WalletConnect CAIP-2 chain stands for, or the chain itself when OISY
 * has no network for it, so a chain is never left out of what the user is shown.
 */
export const getWalletConnectChainName = (chain: string): string =>
	EIP155_CHAINS[chain]?.name ?? CAIP10_CHAINS[chain]?.name ?? BIP122_CHAINS[chain]?.name ?? chain;
