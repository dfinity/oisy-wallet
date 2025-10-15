import type {
	ManageStakePositionArgs,
	StakePositionResponse
} from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { GldtStakeCanister } from '$icp/canisters/gldt_stake.canister';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: GldtStakeCanister | undefined = undefined;

export const getApyOverall = async ({ identity }: CanisterApiFunctionParams): Promise<number> => {
	const { getApyOverall } = await gldtStakeCanister({ identity });

	return getApyOverall();
};

export const manageStakePosition = async ({
	positionParams,
	identity
}: CanisterApiFunctionParams<{ positionParams: ManageStakePositionArgs }>): Promise<
	StakePositionResponse | undefined
> => {
	const { manageStakePosition } = await gldtStakeCanister({ identity });

	return manageStakePosition(positionParams);
};

const gldtStakeCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = GLDT_STAKE_CANISTER_ID
}: CanisterApiFunctionParams): Promise<GldtStakeCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await GldtStakeCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
