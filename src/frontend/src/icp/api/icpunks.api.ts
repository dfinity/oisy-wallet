import type { TokenDesc } from '$declarations/icpunks/icpunks.did';
import { IcPunksCanister } from '$icp/canisters/icpunks.canister';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import type { TokenMetadata } from '$lib/types/token';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const getTokensByOwner = async ({
	certified,
	identity,
	owner: principal,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ owner: Principal } & QueryParams>): Promise<
	bigint[]
> => {
	if (isNullish(identity)) {
		return [];
	}

	const { getTokensByOwner } = await icPunksCanister({
		identity,
		canisterId,
		...rest
	});

	return await getTokensByOwner({ certified, principal });
};

export const transfer = async ({
	certified,
	identity,
	canisterId,
	to,
	tokenIdentifier,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ to: Principal; tokenIdentifier: bigint } & QueryParams
>) => {
	const { transfer } = await icPunksCanister({
		identity,
		canisterId,
		...rest
	});

	await transfer({ certified, to, tokenIdentifier });
};

export const metadata = async ({
	certified,
	identity,
	canisterId,
	tokenIdentifier,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ tokenIdentifier: bigint } & QueryParams
>): Promise<TokenDesc> => {
	const { metadata } = await icPunksCanister({
		identity,
		canisterId,
		...rest
	});

	return await metadata({ certified, tokenIdentifier });
};

export const collectionMetadata = async ({
	certified,
	identity,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<QueryParams>): Promise<
	Omit<TokenMetadata, 'decimals'>
> => {
	const { collectionMetadata } = await icPunksCanister({
		identity,
		canisterId,
		...rest
	});

	return await collectionMetadata({ certified });
};

const icPunksCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId): Promise<IcPunksCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await IcPunksCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
