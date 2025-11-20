import type {
	Args_2,
	DailyAnalytics,
	_SERVICE as GldtStakeService,
	ManageStakePositionArgs,
	StakePositionResponse
} from '$declarations/gldt_stake/gldt_stake.did';
import { idlFactory as idlCertifiedFactoryGldtStake } from '$declarations/gldt_stake/gldt_stake.factory.certified.did';
import { idlFactory as idlFactoryGldtStake } from '$declarations/gldt_stake/gldt_stake.factory.did';
import { mapGldtStakeCanisterError } from '$icp/canisters/gldt_stake.errors';
import { getAgent } from '$lib/actors/agents.ic';
import { ZERO } from '$lib/constants/app.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, fromNullable, toNullable } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

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

	getDailyAnalytics = async (params?: Args_2): Promise<DailyAnalytics> => {
		const defaultParams = { starting_day: ZERO, limit: toNullable(1n) };

		const { get_daily_analytics } = this.caller({ certified: true });

		const [data] = await get_daily_analytics({ ...defaultParams, ...(params ?? {}) });
		const [_, dailyAnalytics] = data;

		return dailyAnalytics;
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

	getPosition = async ({
		principal
	}: {
		principal: Principal;
	}): Promise<StakePositionResponse | undefined> => {
		const { get_position } = this.caller({ certified: true });

		const response = await get_position(principal);

		return fromNullable(response);
	};
}
