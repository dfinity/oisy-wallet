import type {
	Args_2,
	DailyAnalytics,
	ManageStakePositionArgs,
	Response,
	StakePositionResponse
} from '$declarations/gldt_stake/gldt_stake.did';
import { GldtStakeCanister } from '$icp/canisters/gldt_stake.canister';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

let canister: GldtStakeCanister | undefined = undefined;

export const getApyOverall = async ({ identity }: CanisterApiFunctionParams): Promise<number> => {
	const { getApyOverall } = await gldtStakeCanister({ identity });

	return getApyOverall();
};

export const getConfig = async ({ identity }: CanisterApiFunctionParams): Promise<Response> => {
	const { getConfig } = await gldtStakeCanister({ identity });

	return getConfig();
};

export const getDailyAnalytics = async ({
	identity,
	analyticsParams
}: CanisterApiFunctionParams<{ analyticsParams?: Args_2 }>): Promise<DailyAnalytics> => {
	const { getDailyAnalytics } = await gldtStakeCanister({ identity });

	return getDailyAnalytics(analyticsParams);
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

export const getPosition = async ({
	identity,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): Promise<StakePositionResponse | undefined> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	const { getPosition } = await gldtStakeCanister({ identity });

	return getPosition({ principal: identity.getPrincipal() });
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
