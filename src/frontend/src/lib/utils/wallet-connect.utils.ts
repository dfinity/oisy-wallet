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

// Characters that show nothing themselves or rearrange the ones around them: controls, format
// characters such as the bidirectional overrides, isolates and marks and the zero-width joiners,
// and the ones Unicode marks as ignorable by default, such as the variation selectors. Line breaks
// and tabs are kept, since they lay the message out.
const INVISIBLE_MESSAGE_CHARACTERS = /(?![\t\n])[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;

/**
 * A message a dApp asks to sign, as the review shows it. The dApp writes every character, so the
 * text is kept to what is visible and reads in the order its bytes are signed. Only the display
 * changes: what is signed is the request's own payload.
 */
export const visibleMessageText = (message: string): string =>
	message.replace(/\r\n?/gu, '\n').replace(INVISIBLE_MESSAGE_CHARACTERS, '');
