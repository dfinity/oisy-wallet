import type { NotifyMintCyclesSuccess } from '$declarations/cmc/cmc.did';
import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { CmcCanister } from '$icp/canisters/cmc.canister';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const getIcpXdrConversionRate = async ({
	certified,
	...rest
}: CanisterApiFunctionParams<QueryParams>): Promise<bigint> => {
	const { getIcpXdrConversionRate } = await cmcCanister(rest);

	return await getIcpXdrConversionRate({ certified });
};

export const notifyMintCycles = async ({
	blockIndex,
	...rest
}: CanisterApiFunctionParams<{ blockIndex: bigint }>): Promise<NotifyMintCyclesSuccess> => {
	const { notifyMintCycles } = await cmcCanister(rest);

	return await notifyMintCycles({ blockIndex });
};

// Created per call rather than cached: the CMC checks a deposit against the
// caller's own principal, so a client kept across a sign-out would notify as
// the previous identity.
const cmcCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = CMC_CANISTER_ID
}: CanisterApiFunctionParams): Promise<CmcCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await CmcCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
