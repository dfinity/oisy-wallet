import { transfer as transferDip721Api } from '$icp/api/dip721.api';
import { transfer as transferExtApi } from '$icp/api/ext-v2-token.api';
import { transfer as transferIcPunksApi } from '$icp/api/icpunks.api';
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

	await transferExtApi(rest);

	progress?.(ProgressStepsSendIc.RELOAD);
};

export const transferDip721 = async ({
	progress,
	...rest
}: {
	identity: Identity;
	canisterId: CanisterIdText;
	to: Principal;
	tokenIdentifier: bigint;
	progress?: (step: ProgressStepsSendIc) => void;
}) => {
	progress?.(ProgressStepsSendIc.SEND);

	await transferDip721Api(rest);

	progress?.(ProgressStepsSendIc.RELOAD);
};

export const transferIcPunks = async ({
	progress,
	...rest
}: {
	identity: Identity;
	canisterId: CanisterIdText;
	to: Principal;
	tokenIdentifier: bigint;
	progress?: (step: ProgressStepsSendIc) => void;
}) => {
	progress?.(ProgressStepsSendIc.SEND);

	await transferIcPunksApi(rest);

	progress?.(ProgressStepsSendIc.RELOAD);
};
