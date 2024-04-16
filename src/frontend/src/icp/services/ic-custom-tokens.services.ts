import { loadUserTokens } from '$icp/services/icrc.services';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcrcCustomTokenConfig } from '$icp/types/icrc-custom-token';
import { setUserCustomTokens } from '$lib/api/backend.api';
import { AddTokenStep } from '$lib/enums/steps';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: AddTokenStep) => void;
	identity: Identity;
	tokens: IcrcCustomTokenConfig[];
}) => {
	progress(AddTokenStep.SAVE);

	await setUserCustomTokens({
		identity,
		tokens: tokens.map(({ enabled, ledgerCanisterId, indexCanisterId }) => ({
			enabled,
			token: {
				Icrc: {
					ledger_id: Principal.fromText(ledgerCanisterId),
					index_id: Principal.fromText(indexCanisterId)
				}
			}
		}))
	});

	progress(AddTokenStep.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled }) => !enabled);
	disabledTokens.forEach(({ ledgerCanisterId }) => icrcTokensStore.reset(ledgerCanisterId));

	// Reload all custom tokens for simplicity reason.
	await loadUserTokens({ identity });
};
