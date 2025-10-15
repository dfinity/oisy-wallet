import type {
	_SERVICE as GldtStakeService,
	ManageStakePositionArgs,
	StakePositionResponse
} from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { idlFactory as idlCertifiedFactoryGldtStake } from '$declarations/gldt_stake/gldt_stake.factory.certified.did';
import { idlFactory as idlFactoryGldtStake } from '$declarations/gldt_stake/gldt_stake.factory.did';
import { mapGldtStakeCanisterError } from '$icp/canisters/gldt_stake.errors';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class GldtStakeCanister extends Canister<GldtStakeService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<GldtStakeService>): Promise<GldtStakeCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<GldtStakeService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryGldtStake,
			certifiedIdlFactory: idlCertifiedFactoryGldtStake
		});

		return new GldtStakeCanister(canisterId, service, certifiedService);
	}

	getApyOverall = (): Promise<number> => {
		const { get_apy_overall } = this.caller({ certified: true });

		return get_apy_overall(null);
	};

	manageStakePosition = async (
		params: ManageStakePositionArgs
	): Promise<StakePositionResponse | undefined> => {
		const { manage_stake_position } = this.caller({ certified: true });

		const response = await manage_stake_position(params);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapGldtStakeCanisterError(response.Err);
	};
}
