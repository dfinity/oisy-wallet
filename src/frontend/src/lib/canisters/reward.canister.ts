import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	ReferrerInfo,
	_SERVICE as RewardService,
	UserData,
	UserSnapshot,
	VipReward
} from '$declarations/rewards/rewards.did';
import { idlFactory as idlCertifiedFactoryReward } from '$declarations/rewards/rewards.factory.certified.did';
import { idlFactory as idlFactoryReward } from '$declarations/rewards/rewards.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';

export class RewardCanister extends Canister<RewardService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<RewardService>): Promise<RewardCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<RewardService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryReward,
			certifiedIdlFactory: idlCertifiedFactoryReward
		});

		return new RewardCanister(canisterId, service, certifiedService);
	}

	getUserInfo = ({ certified = true }: QueryParams): Promise<UserData> => {
		const { user_info } = this.caller({ certified });

		return user_info();
	};

	getNewVipReward = (): Promise<NewVipRewardResponse> => {
		const { new_vip_reward } = this.caller({ certified: true });

		return new_vip_reward();
	};

	claimVipReward = (vipReward: VipReward): Promise<ClaimVipRewardResponse> => {
		const { claim_vip_reward } = this.caller({ certified: true });

		return claim_vip_reward(vipReward);
	};

	getReferrerInfo = ({ certified = true }: QueryParams): Promise<ReferrerInfo> => {
		const { referrer_info } = this.caller({ certified });

		return referrer_info();
	};

	setReferrer = (referralCode: number): Promise<void> => {
		const { set_referrer } = this.caller({ certified: true });

		return set_referrer(referralCode);
	};

	registerAirdropRecipient = (userSnapshot: UserSnapshot): Promise<void> => {
		const { register_airdrop_recipient } = this.caller({ certified: true });

		return register_airdrop_recipient(userSnapshot);
	};
}
