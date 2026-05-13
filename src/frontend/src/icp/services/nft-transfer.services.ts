import { transfer as transferDip721Api } from '$icp/api/dip721.api';
import { transfer as transferExtApi } from '$icp/api/ext-v2-token.api';
import { transfer as transferIcPunksApi } from '$icp/api/icpunks.api';
import { transfer as transferIcrc7Api } from '$icp/api/icrc7.api';
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

export const transferIcrc7 = async ({
	progress,
	...rest
}: {
	identity: Identity;
	canisterId: CanisterIdText;
	to: Principal;
	tokenIdentifier: bigint;
	certified?: boolean;
	progress?: (step: ProgressStepsSendIc) => void;
}) => {
	progress?.(ProgressStepsSendIc.SEND);

	const result = await transferIcrc7Api({ certified: true, ...rest });

	if ('Err' in result) {
		throw new Error(`ICRC-7 transfer failed: ${JSON.stringify(result.Err)}`);
	}

	progress?.(ProgressStepsSendIc.RELOAD);
};
