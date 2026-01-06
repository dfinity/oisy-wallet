import type { _SERVICE as Dip721Service } from '$declarations/dip721/dip721.did';
import { idlFactory as idlCertifiedFactoryDip721 } from '$declarations/dip721/dip721.factory.certified.did';
import { idlFactory as idlFactoryDip721 } from '$declarations/dip721/dip721.factory.did';
import { mapDip721NftError } from '$icp/canisters/dip721.errors';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

export class Dip721Canister extends Canister<Dip721Service> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<Dip721Service>): Promise<Dip721Canister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<Dip721Service>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryDip721,
			certifiedIdlFactory: idlCertifiedFactoryDip721
		});

		return new Dip721Canister(canisterId, service, certifiedService);
	}

	/**
	 * Returns the count of NFTs owned by the principal.
	 *
	 * @link https://github.com/Psychedelic/DIP721/blob/develop/spec.md#balanceof
	 */
	balance = async ({
		principal,
		certified
	}: { principal: Principal } & QueryParams): Promise<bigint> => {
		const { balanceOf } = this.caller({ certified });

		const response = await balanceOf(principal);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapDip721NftError(response.Err);
	};

	/**
	 * Returns the list of the token_identifier of the NFT associated with the principal.
	 *
	 * @link https://github.com/Psychedelic/DIP721/blob/develop/spec.md#ownertokenidentifiers
	 */
	getTokensByOwner = async ({
		principal,
		certified
	}: { principal: Principal } & QueryParams): Promise<bigint[]> => {
		const { ownerTokenIdentifiers } = this.caller({ certified });

		const response = await ownerTokenIdentifiers(principal);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapDip721NftError(response.Err);
	};
}
