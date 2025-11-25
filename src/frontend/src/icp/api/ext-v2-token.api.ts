import type {
	Balance,
	TokenIdentifier,
	TokenIndex,
	Transaction
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

/**
 * Returns all collection transactions, not filtered by the caller.
 *
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/LEGACY-SUPPORT.md#transactions-api
 *
 * @param {Object} params - The parameters for fetching transactions.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the EXT v2 token.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<Transaction[]>} The array of all collection transactions, not filtered by caller.
 */
export const transactions = async ({
	certified,
	identity,
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

/**
 * Returns the user's balance for a specific token of the collection.
 *
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#balance-1
 *
 * @param {Object} params - The parameters for fetching the balance.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the EXT v2 token.
 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier as string.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<Balance>} The user's balance for the specified token.
 */
export const balance = async ({
	certified,
	identity,
	canisterId,
	tokenIdentifier,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ tokenIdentifier: TokenIdentifier } & QueryParams
>): Promise<Balance> => {
	if (isNullish(identity)) {
		return ZERO;
	}

	const { balance } = await extV2TokenCanister({
		identity,
		canisterId,
		...rest
	});

	return await balance({ tokenIdentifier, account: identity.getPrincipal(), certified });
};

/**
 * Get the list of collection's tokens owned by a specific user.
 *
 * The metadata returned with each token is not the metadata that we need.
 * Please use the method `ext_metadata` instead.
 *
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#tokens_ext
 *
 * @param {Object} params - The parameters for fetching the tokens.
 * @param {Principal} params.owner - The principal of the owner whose tokens should be fetched.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the EXT v2 token.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @returns {Promise<TokenIndex[]>} The list of token indices owned by the user.
 * @throws CanisterInternalError if the token identifier is invalid.
 */
export const getTokensByOwner = async ({
	identity,
	owner,
	certified,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ owner: Principal } & QueryParams>): Promise<
	TokenIndex[]
> => {
	if (isNullish(identity)) {
		return [];
	}

	const { getTokensByOwner } = await extV2TokenCanister({
		identity,
		canisterId,
		...rest
	});

	return await getTokensByOwner({ certified, ...getIcrcAccount(owner) });
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
