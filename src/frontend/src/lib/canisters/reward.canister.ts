import type { _SERVICE as BackendService } from '$declarations/backend/backend.did';
import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class RewardCanister extends Canister<BackendService> {
	// TODO replace BackendService with RewardService or something similar
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<BackendService>): Promise<RewardCanister> {
		// TODO replace BackendService with RewardService or something similar
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<BackendService>({
			// TODO replace BackendService with RewardService or something similar
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryBackend, // TODO replace idlFactoryBackend with idlFactoryReward
			certifiedIdlFactory: idlCertifiedFactoryBackend // TODO replace idlCertifiedFactoryBackend with idlCertifiedFactoryReward
		});

		return new RewardCanister(canisterId, service, certifiedService);
	}

	isVip = (): Promise<boolean> => {
		const { set_user_token } = this.caller({ certified: true }); // TODO replace with isVip function

		return Promise.resolve(true);
	}

	getRewardCode = (): Promise<string> => {
		const { set_user_token } = this.caller({ certified: true }); // TODO replace with getRewardCode function

		return Promise.resolve('12345678901');
	};

	useRewardCode = (code: string): Promise<boolean> => {
		const { set_user_token } = this.caller({ certified: true }); // TODO replace with useRewardCode function

		return Promise.resolve(true);
	};
}
