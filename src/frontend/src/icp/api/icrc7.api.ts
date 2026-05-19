import type { Account, Value } from '$declarations/icrc7/icrc7.did';
import { Icrc7Canister } from '$icp/canisters/icrc7.canister';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const collectionMetadata = async ({
	certified,
	identity,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<QueryParams>): Promise<Array<[string, Value]>> => {
	const { collectionMetadata } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	return await collectionMetadata({ certified });
};

export const getTokensByOwner = async ({
	certified,
	identity,
	canisterId,
	owner,
	prev,
	take,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ owner: Account; prev?: bigint; take?: bigint } & QueryParams
>): Promise<bigint[]> => {
	if (isNullish(identity)) {
		return [];
	}

	const { getTokensByOwner } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	return await getTokensByOwner({ certified, owner, prev, take });
};

export const getOwnersOf = async ({
	certified,
	identity,
	canisterId,
	tokenIds,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ tokenIds: bigint[] } & QueryParams>): Promise<
	Array<[] | [Account]>
> => {
	const { getOwnersOf } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	return await getOwnersOf({ certified, tokenIds });
};

export const tokenMetadata = async ({
	certified,
	identity,
	canisterId,
	tokenIds,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ tokenIds: bigint[] } & QueryParams>): Promise<
	Array<[] | [Array<[string, Value]>]>
> => {
	const { tokenMetadata } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	return await tokenMetadata({ certified, tokenIds });
};

export const transfer = async ({
	certified = true,
	identity,
	canisterId,
	to,
	tokenId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ to: Account; tokenId: bigint } & QueryParams>) => {
	const { transfer } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	await transfer({ certified, to, tokenId });
};

const icrc7Canister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId): Promise<Icrc7Canister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await Icrc7Canister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
