import { SignerCanisterInsufficientAllowanceError } from '$lib/canisters/signer.errors';
import type { SwapError } from '$lib/stores/swap.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';

// What a form tells the user after a charged call (CC) failed with an insufficient allowance, from the
// answer of the allowance request (AR) sent right after it:
// - `renewed`: the AR was granted, or skipped with a larger OISY allowance than at the failure because
//   another tab or device got a new one in the meantime. Trying again works.
// - `refused`: the AR was refused, or not sent during the AR cooldown.
// - `exceeded`: the AR was skipped with no larger OISY allowance. The CC costs more than the OISY
//   allowance, and the backend sets no new one at or above the OISY allowance threshold.
export type InsufficientAllowanceOutcome = 'renewed' | 'refused' | 'exceeded';

export const insufficientAllowanceOutcome = (
	err: unknown
): InsufficientAllowanceOutcome | undefined => {
	if (!(err instanceof SignerCanisterInsufficientAllowanceError)) {
		return undefined;
	}

	const { allowanceRequest, allowance } = err;

	if (allowanceRequest.answer === 'granted') {
		return 'renewed';
	}

	if (allowanceRequest.answer === 'refused') {
		return 'refused';
	}

	return allowanceRequest.allowance > allowance ? 'renewed' : 'exceeded';
};

// Whether the same transaction would fail the same way, so the form disables its main button.
export const blocksRetry = (outcome: InsufficientAllowanceOutcome): boolean =>
	outcome !== 'renewed';

export const insufficientAllowanceMessage = ({
	outcome,
	i18n
}: {
	outcome: InsufficientAllowanceOutcome;
	i18n: I18n;
}): string =>
	replaceOisyPlaceholders(
		{
			renewed: i18n.core.info.oisy_allowance_renewed,
			refused: i18n.core.warning.oisy_allowance_used_up,
			exceeded: i18n.core.warning.oisy_allowance_exceeded
		}[outcome]
	);

// The swap review's box for a CC that failed with an insufficient allowance: an info box when trying
// again works, otherwise a warning that disables Swap, since the same swap would fail the same way.
export const mapInsufficientAllowanceToSwapError = ({
	err,
	i18n
}: {
	err: unknown;
	i18n: I18n;
}): SwapError | undefined => {
	const outcome = insufficientAllowanceOutcome(err);

	if (isNullish(outcome)) {
		return undefined;
	}

	const message = insufficientAllowanceMessage({ outcome, i18n });

	return outcome === 'renewed'
		? { variant: 'info', message }
		: { variant: 'warning', message, disablesSwap: true };
};
