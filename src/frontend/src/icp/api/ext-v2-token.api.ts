import type {
	Balance,
	Metadata,
	MetadataLegacy,
	TokenIdentifier,
	TokenIndex,
	Transaction
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { CanisterInternalError } from '$lib/canisters/errors';
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
 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier of the NFT as string.
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
 * @remarks
 * According to the EXT v2 specification, `tokens_ext` and the legacy `tokens` method
 * are functionally equivalent. However, in practice, some canisters only implement
 * the legacy endpoint. For this reason, this function first attempts to use
 * `tokens_ext` and falls back to the legacy method before propagating
 * any error from the primary call.
 *
 * @param {Object} params - The parameters for fetching the tokens.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the EXT v2 token.
 * @param {Principal} params.owner - The principal of the owner whose tokens should be fetched.
 * @returns {Promise<TokenIndex[]>} The list of token indices owned by the user.
 * @throws CanisterInternalError if the token identifier is invalid.
 */
export const getTokensByOwner = async ({
	certified,
	identity,
	owner,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ owner: Principal } & QueryParams>): Promise<
	TokenIndex[]
> => {
	if (isNullish(identity)) {
		return [];
	}

	const { getTokensByOwner, getTokensByOwnerLegacy } = await extV2TokenCanister({
		identity,
		canisterId,
		...rest
	});

	// Some EXT tokens do not support the new `tokens_ext` endpoint, so we try to use the legacy one as fallback.
	// However, if both raise an error, we throw the one that is most likely to represent the real failure.
	try {
		return await getTokensByOwner({ certified, ...getIcrcAccount(owner) });
	} catch (primaryErr: unknown) {
		try {
			return await getTokensByOwnerLegacy({ certified, ...getIcrcAccount(owner) });
		} catch (legacyErr: unknown) {
			if (
				legacyErr instanceof CanisterInternalError &&
				!(primaryErr instanceof CanisterInternalError)
			) {
				throw legacyErr;
			}

			throw primaryErr;
		}
	}
};

/**
 * Transfer NFT of a collection from one user to another.
 *
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#transfer--ext_transfer
 *
 * @remarks
 * The EXT v2 specification describes `transfer` and `ext_transfer` as equivalent transfer entrypoints,
 * where the latter is an alias of the first one. To maximise compatibility,
 * this function attempts `transfer` first and falls back to the alias endpoint when needed.
 * If both attempts fail, it throws the error that is most likely to reflect the underlying
 * transfer failure.
 *
 * @param {Object} params - The parameters for the transfer.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the EXT v2 token.
 * @param {Principal} params.from - The ICRC principal of the sender.
 * @param {Principal} params.to - The ICRC principal of the receiver.
 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier of the NFT as string.
 * @param {bigint} params.amount - The amount to transfer.
 */
export const transfer = async ({
	certified,
	identity,
	canisterId,
	from,
	to,
	tokenIdentifier,
	amount,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ from: Principal; to: Principal; tokenIdentifier: TokenIdentifier; amount: bigint } & QueryParams
>) => {
	const { transfer, transferAlias } = await extV2TokenCanister({
		identity,
		canisterId,
		...rest
	});

	// Some canisters expose the transfer endpoint under alias name `ext_transfer` instead of `transfer`.
	// We try `transfer` first and fall back to the alias for compatibility/insurance.
	// If both raise an error, we throw the one most likely to represent the real transfer failure.
	try {
		await transfer({ certified, from, to, tokenIdentifier, amount });
	} catch (primaryErr: unknown) {
		try {
			await transferAlias({ certified, from, to, tokenIdentifier, amount });
		} catch (legacyErr: unknown) {
			if (
				legacyErr instanceof CanisterInternalError &&
				!(primaryErr instanceof CanisterInternalError)
			) {
				throw legacyErr;
			}

			throw primaryErr;
		}
	}
};

/**
 * Returns the metadata of a specific token of the collection.
 *
 * It first tries to use the new `ext_metadata` endpoint, and if it fails,
 * it falls back to the legacy `metadata` endpoint for compatibility with older EXT canisters.
 * When both methods are not supported, it returns `undefined`.
 *
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#metadata
 *
 * @param {Object} params - The parameters for fetching the metadata.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.canisterId - The canister ID of the EXT v2 token.
 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier of the NFT as string.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<MetadataLegacy | Metadata | undefined>} The metadata of the specified token or `undefined` if it does not exist.
 */
export const metadata = async ({
	certified,
	identity,
	canisterId,
	tokenIdentifier,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ tokenIdentifier: TokenIdentifier } & QueryParams
>): Promise<MetadataLegacy | Metadata | undefined> => {
	const { metadata } = await extV2TokenCanister({
		identity,
		canisterId,
		...rest
	});

	return await metadata({ tokenIdentifier, certified });
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
