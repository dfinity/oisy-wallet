import type {
	Balance,
	_SERVICE as ExtV2TokenService,
	Metadata,
	MetadataLegacy,
	TokenIdentifier,
	TokenIndex,
	Transaction,
	TransferRequest
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { idlFactory as idlCertifiedFactoryExtV2Token } from '$declarations/ext_v2_token/ext_v2_token.factory.certified.did';
import { idlFactory as idlFactoryExtV2Token } from '$declarations/ext_v2_token/ext_v2_token.factory.did';
import {
	mapExtV2TokenCommonError,
	mapExtV2TokenTransferError
} from '$icp/canisters/ext-v2-token.errors';
import { mapExtTokensListing, toUser } from '$icp/utils/ext-v2-token.utils';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	Canister,
	createServices,
	isNullish,
	nonNullish,
	toNullable,
	type QueryParams
} from '@dfinity/utils';
import type { IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { Principal } from '@icp-sdk/core/principal';

export class ExtV2TokenCanister extends Canister<ExtV2TokenService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<ExtV2TokenService>): Promise<ExtV2TokenCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<ExtV2TokenService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryExtV2Token,
			certifiedIdlFactory: idlCertifiedFactoryExtV2Token
		});

		return new ExtV2TokenCanister(canisterId, service, certifiedService);
	}

	/**
	 * Fetches all collection transactions, not filtered by the caller.
	 *
	 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/LEGACY-SUPPORT.md#transactions-api
	 */
	transactions = async ({ certified }: QueryParams): Promise<Transaction[]> => {
		const { transactions } = this.caller({ certified });

		return await transactions();
	};

	/**
	 * Get the balance of a user for a specific token of the collection.
	 *
	 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#balance-1
	 *
	 * @param {Object} params - The parameters for fetching the balance.
	 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier of the NFT as string.
	 * @param {Principal} params.account - The principal of the user.
	 * @param {boolean} [params.certified=true] - Whether the data should be certified.
	 * @returns {Promise<Balance>} The balance of the user for the specified token.
	 * @throws CanisterInternalError if the token identifier is invalid.
	 */
	balance = async ({
		tokenIdentifier: token,
		account,
		certified
	}: { tokenIdentifier: TokenIdentifier; account: Principal } & QueryParams): Promise<Balance> => {
		const { balance } = this.caller({ certified });

		const response = await balance({ token, user: toUser(account) });

		if ('ok' in response) {
			return response.ok;
		}

		throw mapExtV2TokenCommonError(response.err);
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
	 * @param {Principal} params.owner - The ICRC principal of the user.
	 * @param {boolean} [params.certified=true] - Whether the data should be certified.
	 * @returns {Promise<TokenIndex[]>} The list of token indices owned by the user.
	 * @throws CanisterInternalError if the token identifier is invalid.
	 */
	getTokensByOwner = async ({
		certified,
		owner
	}: IcrcAccount & QueryParams): Promise<TokenIndex[]> => {
		const { tokens_ext } = this.caller({ certified });

		const response = await tokens_ext(getAccountIdentifier(owner).toHex());

		if ('ok' in response) {
			return mapExtTokensListing(response.ok);
		}

		// If the owner has no tokens in the collection, apparently it is returned as a generic `Other` error.
		// Since we don't have a resilient way of distinguishing this from other errors, we manually compare the error message (case-insensitive).
		if ('Other' in response.err && response.err.Other.toLowerCase() === 'no tokens') {
			return [];
		}

		throw mapExtV2TokenCommonError(response.err);
	};

	/**
	 * Transfer NFT of a collection from one user to another.
	 *
	 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#transfer--ext_transfer
	 *
	 * @param {Object} params - The parameters for the transfer.
	 * @param {Principal} params.from - The ICRC principal of the sender.
	 * @param {Principal} params.to - The ICRC principal of the receiver.
	 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier of the NFT as string.
	 * @param {bigint} params.amount - The amount to transfer.
	 * @param {boolean} [params.certified=true] - Whether the data should be certified.
	 * @returns {Promise<Balance>} The new balance of the sender after the transfer.
	 * @throws CanisterInternalError if the token identifier is invalid or if the transfer fails.
	 */
	transfer = async ({
		certified,
		from,
		to,
		tokenIdentifier: token,
		amount
	}: {
		from: Principal;
		to: Principal;
		tokenIdentifier: TokenIdentifier;
		amount: bigint;
	} & QueryParams): Promise<Balance> => {
		const { ext_transfer } = this.caller({ certified });

		const args: TransferRequest = {
			from: toUser(from),
			to: toUser(to),
			token,
			amount,
			notify: false,
			memo: new Uint8Array(),
			subaccount: toNullable()
		};

		const response = await ext_transfer(args);

		if ('ok' in response) {
			return response.ok;
		}

		throw mapExtV2TokenTransferError(response);
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
	 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier of the NFT as string.
	 * @param {boolean} [params.certified=true] - Whether the data should be certified.
	 * @returns {Promise<MetadataLegacy | Metadata | undefined>} The metadata of the specified token or `undefined` if it does not exist.
	 * @throws CanisterInternalError if the token identifier is invalid.
	 */
	metadata = async ({
		tokenIdentifier: token,
		certified
	}: { tokenIdentifier: TokenIdentifier } & QueryParams): Promise<
		MetadataLegacy | Metadata | undefined
	> => {
		const { metadata, ext_metadata } = this.caller({ certified });

		const getMetadata = async () => {
			try {
				return await ext_metadata(token);
			} catch (_: unknown) {
				// Some legacy EXT canisters still do not support the new metadata endpoint.
			}
		};

		const getLegacyMetadata = async () => {
			try {
				return await metadata(token);
			} catch (_: unknown) {
				// Some new EXT canisters still do not support the legacy metadata endpoint.
			}
		};

		const response = await getMetadata();

		if (nonNullish(response) && 'ok' in response) {
			return response.ok;
		}

		const legacyResponse = await getLegacyMetadata();

		if (nonNullish(legacyResponse) && 'ok' in legacyResponse) {
			return legacyResponse.ok;
		}

		const error = response?.err ?? legacyResponse?.err;

		if (isNullish(error)) {
			return;
		}

		throw mapExtV2TokenCommonError(error);
	};
}
