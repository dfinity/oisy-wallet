import type {
	DataCertificate,
	GetArchivesResult,
	GetBlocksArgs,
	GetBlocksResult
} from '$declarations/icrc3/icrc3.did';
import { Icrc3Canister } from '$icp/canisters/icrc3.canister';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const getArchives = async ({
	certified,
	identity,
	canisterId,
	from,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ from?: Principal } & QueryParams
>): Promise<GetArchivesResult> => {
	const { getArchives } = await icrc3Canister({ identity, canisterId, ...rest });

	return await getArchives({ certified, from });
};

export const getBlocks = async ({
	certified,
	identity,
	canisterId,
	args,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ args: GetBlocksArgs } & QueryParams
>): Promise<GetBlocksResult> => {
	const { getBlocks } = await icrc3Canister({ identity, canisterId, ...rest });

	return await getBlocks({ certified, args });
};

export const getTipCertificate = async ({
	certified,
	identity,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<QueryParams>): Promise<DataCertificate | undefined> => {
	const { getTipCertificate } = await icrc3Canister({ identity, canisterId, ...rest });

	return await getTipCertificate({ certified });
};

export const supportedBlockTypes = async ({
	certified,
	identity,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<QueryParams>): Promise<
	Array<{ url: string; block_type: string }>
> => {
	const { supportedBlockTypes } = await icrc3Canister({ identity, canisterId, ...rest });

	return await supportedBlockTypes({ certified });
};

const icrc3Canister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId): Promise<Icrc3Canister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await Icrc3Canister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
