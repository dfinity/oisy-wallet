import { transfer } from '$icp/api/ext-v2-token.api';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
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
	progress?: (step: ProgressStepsSendIc) => void;
}) => {
	progress?.(ProgressStepsSendIc.SEND);

	await transfer(rest);

	progress?.(ProgressStepsSendIc.RELOAD);
};
