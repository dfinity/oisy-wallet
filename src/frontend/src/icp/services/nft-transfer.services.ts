import { transfer } from '$icp/api/ext-v2-token.api';
import {
	ProgressStepsSend as ProgressStepsSendEnum,
	type ProgressStepsSend
} from '$lib/enums/progress-steps';
import type { CanisterIdText } from '$lib/types/canister';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

export const transferExtV2 = async ({
	progress,
	...rest
}: {
	identity: Identity;
	canisterId: CanisterIdText;
	from: Principal;
	to: Principal;
	tokenIdentifier: string;
	amount: bigint;
	progress?: (step: ProgressStepsSend) => void;
}) => {
	progress?.(ProgressStepsSendEnum.SIGN_TRANSFER);

	await transfer(rest);

	progress?.(ProgressStepsSendEnum.TRANSFER);
};
