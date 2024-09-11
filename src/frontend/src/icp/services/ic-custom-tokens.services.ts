import { loadCustomTokens } from '$icp/services/icrc.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

export type SaveCustomToken = Pick<
	IcrcCustomToken,
	'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'
>;

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: SaveCustomToken[];
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
	disabledTokens.forEach(({ ledgerCanisterId }) => icrcCustomTokensStore.reset(ledgerCanisterId));

	// Reload all custom tokens for simplicity reason.
	await loadCustomTokens({ identity });
};

export const enableCkTwinTokenInCustomTokens = async ({
	identity,
	ckTwinToken
}: {
	identity: OptionIdentity;
	ckTwinToken: SaveCustomToken | undefined;
}) => {
	if (ckTwinToken?.enabled) {
		return;
	}

	assertNonNullish(identity);

	assertNonNullish(ckTwinToken, get(i18n).send.assertion.ck_twin_token_missing);

	await saveCustomTokens({
		progress: () => {},
		identity,
		tokens: [{ ...ckTwinToken, enabled: true }]
	});
};
