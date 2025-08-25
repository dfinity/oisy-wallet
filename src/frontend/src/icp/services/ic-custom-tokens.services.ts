import { loadCustomTokens } from '$icp/services/icrc.services';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';

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
	// TODO: this is renamed in this PR but, it's actually a bug. That should be icrcCustomTokensStore
	disabledTokens.forEach(({ ledgerCanisterId }) => icrcDefaultTokensStore.reset(ledgerCanisterId));

	// Reload all custom tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
