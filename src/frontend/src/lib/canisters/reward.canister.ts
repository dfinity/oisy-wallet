import type {
	CancelQrGiftCodeResponse,
	ClaimedVipReward,
	CreateQrGiftCodeRequest,
	CreateQrGiftCodeResponse,
	EligibilityReport,
	NewVipRewardResponse,
	QrGiftCodeEntry,
	QrGiftCodeInfoResponse,
	RedeemQrGiftCodeRequest,
	RedeemQrGiftCodeResponse,
	ReferrerInfo,
	_SERVICE as RewardService,
	SetReferrerResponse,
	UserData,
	UserSnapshot,
	VipReward
} from '$declarations/rewards/rewards.did';
import { idlFactory as idlCertifiedFactoryReward } from '$declarations/rewards/rewards.factory.certified.did';
import { idlFactory as idlFactoryReward } from '$declarations/rewards/rewards.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { EligibilityError } from '$lib/types/errors';
import type { RewardClaimApiResponse } from '$lib/types/reward';
import {
	Canister,
	createServices,
	fromNullable,
	toNullable,
	type QueryParams
} from '@dfinity/utils';

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

	isEligible = async ({ certified = true }: QueryParams): Promise<EligibilityReport> => {
		const { eligible } = this.caller({ certified });

		const response = await eligible(toNullable());

		if ('Ok' in response) {
			return response.Ok;
		}
		if ('Err' in response) {
			throw new EligibilityError();
		}
		throw new Error('Unknown error');
	};

	getUserInfo = ({ certified = true }: QueryParams): Promise<UserData> => {
		const { user_info } = this.caller({ certified });

		return user_info();
	};

	getNewVipReward = (rewardType: ClaimedVipReward): Promise<NewVipRewardResponse> => {
		const { new_vip_reward } = this.caller({ certified: true });

		return new_vip_reward(toNullable(rewardType));
	};

	claimVipReward = async (vipReward: VipReward): Promise<RewardClaimApiResponse> => {
		const { claim_vip_reward } = this.caller({ certified: true });

		const [claimRewardResponse, claimedVipReward] = await claim_vip_reward(vipReward);
		return { claimRewardResponse, claimedVipReward: fromNullable(claimedVipReward) };
	};

	getReferrerInfo = ({ certified = true }: QueryParams): Promise<ReferrerInfo> => {
		const { referrer_info } = this.caller({ certified });

		return referrer_info();
	};

	setReferrer = (referralCode: number): Promise<SetReferrerResponse> => {
		const { set_referrer } = this.caller({ certified: true });

		return set_referrer(referralCode);
	};

	registerAirdropRecipient = (userSnapshot: UserSnapshot): Promise<void> => {
		const { register_airdrop_recipient } = this.caller({ certified: true });

		return register_airdrop_recipient(userSnapshot);
	};

	createQrGiftCode = (request: CreateQrGiftCodeRequest): Promise<CreateQrGiftCodeResponse> => {
		const { create_qr_gift_code } = this.caller({ certified: true });

		return create_qr_gift_code(request);
	};

	redeemQrGiftCode = (request: RedeemQrGiftCodeRequest): Promise<RedeemQrGiftCodeResponse> => {
		const { redeem_qr_gift_code } = this.caller({ certified: true });

		return redeem_qr_gift_code(request);
	};

	cancelQrGiftCode = (code: string): Promise<CancelQrGiftCodeResponse> => {
		const { cancel_qr_gift_code } = this.caller({ certified: true });

		return cancel_qr_gift_code(code);
	};

	getQrGiftCodeInfo = async ({
		certified = true,
		code
	}: { code: string } & QueryParams): Promise<QrGiftCodeInfoResponse | undefined> => {
		const { qr_gift_code_info } = this.caller({ certified });

		const result = await qr_gift_code_info(code);
		return fromNullable(result);
	};

	getMyQrGiftCodes = ({ certified = true }: QueryParams): Promise<QrGiftCodeEntry[]> => {
		const { my_qr_gift_codes } = this.caller({ certified });

		return my_qr_gift_codes();
	};
}
