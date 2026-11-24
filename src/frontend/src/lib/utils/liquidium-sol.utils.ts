import { LiquidiumSolBlockhashExpiredError } from '$lib/types/errors';
import { mapSolanaErrorMsg } from '$sol/utils/sol-error.utils';

// What the user is told about a native SOL transfer to Liquidium that was never sent, from the
// failure its refusal wraps. Only a translated message: the failure itself is for the console.
export const liquidiumSolRefusalMessage = ({
	cause,
	i18n
}: {
	cause: unknown;
	i18n: I18n;
}): string =>
	cause instanceof LiquidiumSolBlockhashExpiredError
		? i18n.send.error.solana_transaction_expired
		: (mapSolanaErrorMsg(cause) ?? i18n.liquidium.text.transaction_failed);
