import { loadUserTokens } from '$icp/services/icrc.services';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { isNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: Pick<IcrcCustomToken, 'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'>[];
}) => {
	progress(ProgressStepsAddToken.SAVE);

	await setManyCustomTokens({
		identity,
		tokens: tokens.map(({ enabled, version, ledgerCanisterId, indexCanisterId }) => ({
			enabled,
			version: toNullable(version),
			token: {
				Icrc: {
					ledger_id: Principal.fromText(ledgerCanisterId),
					index_id: toNullable(Principal.fromText(indexCanisterId))
				}
			}
		}))
	});

	progress(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled }) => !enabled);
	disabledTokens.forEach(({ ledgerCanisterId }) => icrcTokensStore.reset(ledgerCanisterId));

	// Reload all custom tokens for simplicity reason.
	await loadUserTokens({ identity });
};

export const saveIcrcCustomToken = async ({
	tokens,
	progress,
	modalNext,
	onSuccess,
	onError,
	identity
}: {
	tokens: Pick<IcrcCustomToken, 'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'>[];
	progress: (step: ProgressStepsAddToken) => void;
	modalNext: () => void;
	onSuccess: () => void;
	onError: () => void;
	identity: OptionIdentity;
}) => {
	const $i18n = get(i18n);

	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	if (tokens.length === 0) {
		toastsError({
			msg: { text: $i18n.tokens.manage.error.empty }
		});
		return;
	}

	modalNext();

	try {
		await saveCustomTokens({
			identity,
			tokens,
			progress
		});

		progress(ProgressStepsAddToken.DONE);

		setTimeout(() => onSuccess(), 750);
	} catch (err: unknown) {
		toastsError({
			msg: { text: $i18n.tokens.error.unexpected },
			err
		});

		onError();
	}
};
