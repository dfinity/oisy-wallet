import type { TransferResult } from '$declarations/icrc7/icrc7.did';
import { Icrc7Canister, type Icrc7TokenMetadata } from '$icp/canisters/icrc7.canister';
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

	const { getTokensByOwner } = await icrc7Canister({
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
>): Promise<TransferResult> => {
	const { transfer } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	return await transfer({ certified, to, tokenIdentifier });
};

export const metadata = async ({
	certified,
	identity,
	canisterId,
	tokenIdentifier,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ tokenIdentifier: bigint } & QueryParams
>): Promise<Icrc7TokenMetadata> => {
	const { metadata } = await icrc7Canister({
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
	const { collectionMetadata } = await icrc7Canister({
		identity,
		canisterId,
		...rest
	});

	return await collectionMetadata({ certified });
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
