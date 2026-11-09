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

// Control characters, and the bidirectional controls, which reorder the text around them. Line
// breaks and tabs are kept, since they lay the message out. Other format characters are kept:
// each shows, like the Arabic number sign, joins or varies the characters next to it, like the
// zero-width joiner in an emoji or a variation selector, or shows nothing either way.
const MESSAGE_CONTROL_CHARACTERS = /(?![\t\n])[\p{Cc}\p{Bidi_Control}]/gu;

/**
 * A message a dApp asks to sign, as the review shows it. The dApp writes every character, so its
 * control characters are left out, the bidirectional ones included. The reviews lay it out with
 * `dir="ltr"` and `unicode-bidi: isolate-override`, so right-to-left letters do not reorder the
 * digits and punctuation next to them either, and it reads in the order its bytes are signed.
 * Only the display changes: what is signed is the request's own payload.
 */
export const visibleMessageText = (message: string): string =>
	message.replace(/\r\n?/gu, '\n').replace(MESSAGE_CONTROL_CHARACTERS, '');
