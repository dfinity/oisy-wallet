import type { GetBlocksResult, Value } from '$declarations/icrc3/icrc3.did';
import { getBlocks } from '$icp/api/icrc3.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import { nonNullish, type QueryParams } from '@dfinity/utils';

export interface Icrc3Block {
	id: bigint;
	block: Value;
}

export interface LoadIcrc3BlockLogParams extends QueryParams {
	identity: NullishIdentity;
	canisterId: CanisterIdText;
	start: bigint;
	length: bigint;
}

export interface LoadIcrc3BlockLogResult {
	logLength: bigint;
	blocks: Icrc3Block[];
}

const compareIcrc3BlockIds = ({ a, b }: { a: Icrc3Block; b: Icrc3Block }): number =>
	a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const loadArchivedBlocks = async ({
	identity,
	certified,
	archivedBlocks
}: {
	identity: NullishIdentity;
	certified?: boolean;
	archivedBlocks: GetBlocksResult['archived_blocks'];
}): Promise<Icrc3Block[]> => {
	const responses = await Promise.all(
		archivedBlocks
			.filter(({ callback: [, method] }) => method === 'icrc3_get_blocks')
			.map(async ({ callback: [archiveCanisterId], args }) => {
				const { blocks } = await getBlocks({
					identity,
					canisterId: archiveCanisterId.toText(),
					certified,
					args
				});

				return blocks;
			})
	);

	return responses.flat();
};

export const loadIcrc3BlockLog = async ({
	identity,
	canisterId,
	start,
	length,
	certified
}: LoadIcrc3BlockLogParams): Promise<LoadIcrc3BlockLogResult> => {
	const {
		blocks,
		archived_blocks: archivedBlocks,
		log_length: logLength
	} = await getBlocks({
		identity,
		canisterId,
		certified,
		args: [{ start, length }]
	});

	const archived = nonNullish(archivedBlocks)
		? await loadArchivedBlocks({ identity, certified, archivedBlocks })
		: [];

	return {
		logLength,
		blocks: [...blocks, ...archived].sort((a, b) => compareIcrc3BlockIds({ a, b }))
	};
};
