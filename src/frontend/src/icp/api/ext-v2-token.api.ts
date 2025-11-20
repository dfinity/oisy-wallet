import type { Transaction } from '$declarations/ext_v2_token/ext_v2_token.did';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

/**
 * TBD (we need to find out if the transactions returned are only for the caller or for the entire token)
 *
 * @param {Object} params - The parameters for fetching metadata.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the ETX v2 token.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<Transaction[]>} The array of transactions of ????????????????????????????????????
 */
export const transactions = async ({
	identity,
	certified,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<QueryParams>): Promise<Transaction[]> => {
	const { transactions } = await extV2TokenCanister({
		identity,
		canisterId,
		...rest
	});

	return await transactions({ certified });
};

const extV2TokenCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId): Promise<ExtV2TokenCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await ExtV2TokenCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
