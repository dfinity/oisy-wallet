import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { removeCustomToken } from '$lib/api/backend.api';
import {
	TRACK_COUNT_XRP_TRUST_LINE_ADD_ERROR,
	TRACK_COUNT_XRP_TRUST_LINE_REMOVE_ERROR
} from '$lib/constants/analytics.constants';
import { ProgressStepsAddToken, ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { SaveCustomXrpTrustLineVariant } from '$lib/types/custom-token';
import type { NullishIdentity } from '$lib/types/identity';
import type { NonEmptyArray } from '$lib/types/utils';
import { consoleWarn } from '$lib/utils/console.utils';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { XRP_OWNER_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
import { loadXrpAccountLines } from '$xrp/rest/xrpl.rest';
import { loadCustomTokens } from '$xrp/services/xrp-custom-tokens.services';
import { submitXrpTrustSet } from '$xrp/services/xrp-trust-set.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import {
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError,
	XrpTrustLineBalanceNotZeroError,
	XrpTrustLineNotHeldError,
	XrpTrustSetUnfundedError
} from '$xrp/types/xrp-send';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
import {
	xrpActiveUserTransactionNetwork,
	xrpTrustSetActiveUserTransactionDisplay
} from '$xrp/utils/xrp-active-tx.utils';
import { xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

// Each held line is saved at most once per session, whatever the outcome: a save that keeps failing
// must not be retried on every reload of the list it triggers.
const attemptedIdentifiers = new Set<string>();

/**
 * Saves held trust-line tokens the backend has no entry for, enabled, the way `LoaderCollections`
 * saves the NFTs it finds. The ledger only holds a line the user added — through a `TrustSet` whose
 * backend write then failed, say — so the token is theirs and belongs in their list.
 */
export const saveUnsavedXrpTrustLineTokens = async ({
	identity,
	tokens
}: {
	identity: Identity;
	tokens: XrpTrustLineCustomToken[];
}): Promise<void> => {
	const unsaved = tokens.filter(
		(token) => !attemptedIdentifiers.has(xrpTrustLineIdentifier(token))
	);

	if (unsaved.length === 0) {
		return;
	}

	unsaved.forEach((token) => attemptedIdentifiers.add(xrpTrustLineIdentifier(token)));

	try {
		await saveCustomTokens({
			identity,
			tokens: unsaved.map(({ currency, issuer }) => ({
				currency,
				issuer,
				networkKey: 'XrpTrustLineMainnet',
				enabled: true
			})) as NonEmptyArray<SaveCustomXrpTrustLineVariant>
		});
	} catch (err: unknown) {
		// Not the user's action, so no toast: the token is shown either way, and the next session tries
		// again.
		consoleWarn('Could not save the XRP Ledger tokens held on the ledger:', err);
	}
};

// The add flow's steps, on the modal's own scale: reading, signing, submitting.
const toAddTokenStep = (step: ProgressStepsSendXrp): ProgressStepsAddToken =>
	step === ProgressStepsSendXrp.SIGN
		? ProgressStepsAddToken.SAVE
		: step === ProgressStepsSendXrp.SEND
			? ProgressStepsAddToken.UPDATE_UI
			: ProgressStepsAddToken.INITIALIZATION;

// Every failure here comes before the broadcast — after it, the record decides — so none of them
// sent anything. Some come after signing, so none claims nothing was signed.
const addXrpTrustLineTokenErrorText = (err: unknown): string => {
	const {
		tokens: {
			import: { error }
		}
	} = get(i18n);

	if (err instanceof XrpSendAlreadyInFlightError) {
		return error.xrp_transaction_in_flight;
	}

	if (err instanceof XrpSendNotGuardedError) {
		return error.xrp_not_guarded;
	}

	if (err instanceof XrpTrustSetUnfundedError) {
		return error.xrp_trust_set_unfunded;
	}

	return error.xrp_add_failed;
};

/**
 * Adds a reviewed trust-line token: sends its `TrustSet`, with the modal's progress, and hands the
 * outcome to the record. The token is not saved here — the ledger has not added it yet; once it
 * has, the wallet reads the new line and saves the token to the list from there.
 */
export const addXrpTrustLineToken = async ({
	identity,
	source,
	token,
	fee,
	progress,
	modalNext,
	onSuccess,
	onError
}: {
	identity: NullishIdentity;
	source: Nullish<XrpAddress>;
	token: XrpTrustLineCustomToken;
	fee: XrpBalance;
	progress?: (step: ProgressStepsAddToken) => void;
	modalNext?: () => void;
	onSuccess?: () => void;
	onError?: () => void;
}): Promise<void> => {
	const network = mapNetworkIdToNetwork(token.network.id);

	if (isNullish(network) || isNullish(source)) {
		toastsError({ msg: { text: get(i18n).tokens.import.error.xrp_state_unavailable } });
		return;
	}

	modalNext?.();

	try {
		await submitXrpTrustSet({
			identity,
			network,
			source,
			token,
			change: 'add',
			fee,
			progress: (step) => progress?.(toAddTokenStep(step))
		});

		progress?.(ProgressStepsAddToken.DONE);

		toastsShow({
			text: replacePlaceholders(get(i18n).tokens.import.text.xrp_add_submitted, {
				$symbol: token.symbol
			}),
			level: 'info',
			duration: 5000
		});

		setTimeout(() => onSuccess?.(), 750);
	} catch (err: unknown) {
		// Only refusals before the broadcast get here, so this add did not happen. One that was sent
		// reports from its record, as a send does.
		trackEvent({
			name: TRACK_COUNT_XRP_TRUST_LINE_ADD_ERROR,
			metadata: {
				token: token.symbol,
				network: `${token.network.id.description}`,
				fee: fee.toString()
			}
		});

		toastsError({ msg: { text: addXrpTrustLineTokenErrorText(err) }, err });

		onError?.();
	}
};

// Every failure here comes before the broadcast — after it, the record decides — so none of them
// sent anything.
const removeXrpTrustLineTokenErrorText = ({
	err,
	token: { symbol }
}: {
	err: unknown;
	token: XrpTrustLineCustomToken;
}): string => {
	const {
		tokens: {
			import: { error }
		}
	} = get(i18n);

	if (err instanceof XrpSendAlreadyInFlightError) {
		return error.xrp_transaction_in_flight;
	}

	if (err instanceof XrpSendNotGuardedError) {
		return error.xrp_not_guarded;
	}

	if (err instanceof XrpTrustSetUnfundedError) {
		return error.xrp_insufficient_fee;
	}

	if (err instanceof XrpTrustLineNotHeldError) {
		return replacePlaceholders(error.xrp_remove_not_held, { $symbol: symbol });
	}

	if (err instanceof XrpTrustLineBalanceNotZeroError) {
		return replacePlaceholders(error.xrp_remove_balance_not_zero, { $symbol: symbol });
	}

	return error.xrp_remove_failed;
};

/**
 * Removes a trust-line token the user confirmed removing: sends the `TrustSet` that takes its line
 * back to the default state, and hands the outcome to the record.
 *
 * The backend entry stays for now. The line is on the ledger until the `TrustSet` validates, and a
 * held line without an entry is saved back to the list; the entry goes once the ledger has deleted
 * the line (`reportRemovedXrpTrustLineToken`).
 */
export const removeXrpTrustLineToken = async ({
	identity,
	source,
	token,
	fee,
	onSuccess,
	onError
}: {
	identity: NullishIdentity;
	source: Nullish<XrpAddress>;
	token: XrpTrustLineCustomToken;
	fee: XrpBalance;
	onSuccess?: () => Promise<void> | void;
	onError?: (err: unknown) => void;
}): Promise<void> => {
	const network = mapNetworkIdToNetwork(token.network.id);

	if (isNullish(network) || isNullish(source)) {
		toastsError({ msg: { text: get(i18n).tokens.import.error.xrp_state_unavailable } });

		onError?.(undefined);
		return;
	}

	try {
		await submitXrpTrustSet({ identity, network, source, token, change: 'remove', fee });
	} catch (err: unknown) {
		// Only refusals before the broadcast get here, so this removal did not happen. One that was
		// sent reports from its record.
		trackEvent({
			name: TRACK_COUNT_XRP_TRUST_LINE_REMOVE_ERROR,
			metadata: {
				token: token.symbol,
				network: `${token.network.id.description}`,
				fee: fee.toString()
			}
		});

		toastsError({ msg: { text: removeXrpTrustLineTokenErrorText({ err, token }) }, err });

		onError?.(err);
		return;
	}

	toastsShow({
		text: replacePlaceholders(get(i18n).tokens.import.text.xrp_remove_submitted, {
			$symbol: token.symbol
		}),
		level: 'info',
		duration: 5000
	});

	await onSuccess?.();
};

/**
 * Says how a removal ended once its `TrustSet` succeeded, and drops the token's backend entry once
 * its line is gone.
 *
 * Success alone does not say the line is gone. The `TrustSet` puts the account's side of the line
 * back at its default state, which releases the account's reserve; the ledger deletes the line only
 * when the issuer's side is at its default state too, and keeps it while the issuer holds settings
 * on it — a freeze, a limit (rippled `TrustSet.cpp`). The line is read again to tell the two apart.
 */
export const reportRemovedXrpTrustLineToken = async ({
	identity,
	tx
}: {
	identity: NullishIdentity;
	tx: ActiveUserTransaction;
}): Promise<void> => {
	if (!('XrpTrustSet' in tx.data) || !('XrpTrustLineMainnet' in tx.data.XrpTrustSet.token)) {
		return;
	}

	const {
		token: {
			XrpTrustLineMainnet: [currency, issuer]
		},
		source_address: source
	} = tx.data.XrpTrustSet;

	const {
		tokens: {
			import: { text }
		}
	} = get(i18n);

	const placeholders = {
		$symbol: xrpTrustSetActiveUserTransactionDisplay(tx)?.symbol ?? '',
		$amount: formatToken({ value: XRP_OWNER_RESERVE_DROPS, unitName: XRP_TOKEN.decimals })
	};

	const network = xrpActiveUserTransactionNetwork(tx);

	let held: boolean;

	try {
		if (isNullish(network)) {
			throw new Error('The removed token has no XRP network to read its line on.');
		}

		const identifier = xrpTrustLineIdentifier({ currency, issuer });
		const lines = await loadXrpAccountLines({ address: source, network, peer: issuer });

		held = lines.some((line) => xrpTrustLineIdentifier(line) === identifier);
	} catch (err: unknown) {
		// The removal went through; only whether the line went with it is unknown, so nothing more is
		// claimed. The next read of the account's lines shows the token or drops it.
		consoleWarn('Could not read the XRP Ledger line of a removed token:', err);

		toastsShow({
			text: replacePlaceholders(text.xrp_token_remove_settled, placeholders),
			level: 'success',
			duration: 4000
		});
		return;
	}

	if (held) {
		toastsShow({
			text: replacePlaceholders(text.xrp_token_kept, placeholders),
			level: 'info',
			duration: 8000
		});
		return;
	}

	toastsShow({
		text: replacePlaceholders(text.xrp_token_removed, placeholders),
		level: 'success',
		duration: 4000
	});

	if (isNullish(identity)) {
		return;
	}

	try {
		await removeCustomToken({
			identity,
			token: toCustomToken({
				currency,
				issuer,
				networkKey: 'XrpTrustLineMainnet',
				enabled: true
			})
		});

		await loadCustomTokens({ identity });
	} catch (err: unknown) {
		// Not the user's action, so no toast: a backend entry without its line is not listed, and the
		// token reads as not added either way.
		consoleWarn('Could not remove the XRP Ledger token from the backend list:', err);
	}
};
