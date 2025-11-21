import type {
	Balance,
	_SERVICE as ExtV2TokenService,
	TokenIdentifier,
	Transaction
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { idlFactory as idlCertifiedFactoryExtV2Token } from '$declarations/ext_v2_token/ext_v2_token.factory.certified.did';
import { idlFactory as idlFactoryExtV2Token } from '$declarations/ext_v2_token/ext_v2_token.factory.did';
import { mapExtV2TokenBalanceError } from '$icp/canisters/ext-v2-token.errors';
import { toUser } from '$icp/utils/ext-v2-token.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';
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
	 * Get the balance of a user for a specific token.
	 *
	 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#balance-1
	 *
	 * @param {Object} params - The parameters for fetching the balance.
	 * @param {TokenIdentifier} params.tokenIdentifier - The token identifier as string.
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

		throw mapExtV2TokenBalanceError(response.err);
	};
}
