import type { CustomToken } from '$declarations/backend/backend.did';
import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
import { Principal } from '@dfinity/principal';
import { nonNullish, toNullable } from '@dfinity/utils';

export const toCustomToken = ({
	enabled,
	version,
	ledgerCanisterId,
	indexCanisterId
}: SaveCustomToken): CustomToken => ({
	enabled,
	version: toNullable(version),
	token: {
		Icrc: {
			ledger_id: Principal.fromText(ledgerCanisterId),
			index_id: toNullable(
				nonNullish(indexCanisterId) ? Principal.fromText(indexCanisterId) : undefined
			)
		}
	}
});
