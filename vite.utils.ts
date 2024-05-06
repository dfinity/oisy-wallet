import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readIds = ({
	filePath,
	prefix
}: {
	filePath: string;
	prefix?: string;
}): Record<string, string> => {
	try {
		type Details = {
			ic?: string;
			staging?: string;
			local?: string;
		};

		const config: Record<string, Details> = JSON.parse(readFileSync(filePath, 'utf8'));

		return Object.entries(config).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			const ids = Object.entries(canisterDetails).reduce(
				(acc, [network, id]) => ({
					...acc,
					[`${prefix ?? ''}${network.toUpperCase()}_${canisterName
						.replaceAll('-', '_')
						.replaceAll("'", '')
						.toUpperCase()}_CANISTER_ID`]: id
				}),
				{}
			);

			return {
				...acc,
				...ids
			};
		}, {});
	} catch (e) {
		console.warn(`Could not get canister ID from ${filePath}: ${e}`);
		return {};
	}
};

/**
 * Read all the locally deployed canister IDs. For example Oisy backend, ckBTC|ETH, ICP etc.
 * @param prefix
 */
const readLocalCanisterIds = ({ prefix }: { prefix?: string }): Record<string, string> => {
	const canisterIdsJsonFile = join(process.cwd(), '.dfx', 'local', 'canister_ids.json');
	return readIds({ filePath: canisterIdsJsonFile, prefix });
};

/**
 * Read Oisy staging and production canister IDs
 * @param prefix
 */
const readOisyCanisterIds = ({ prefix }: { prefix?: string }): Record<string, string> => {
	const canisterIdsJsonFile = join(process.cwd(), 'canister_ids.json');
	return readIds({ filePath: canisterIdsJsonFile, prefix });
};

/**
 * Read IC staging and production canister IDs. For example ckBTC staging and production but, also ICP ledger production
 * @param prefix
 */
const readRemoteCanisterIds = ({ prefix }: { prefix?: string }): Record<string, string> => {
	const dfxJsonFile = join(process.cwd(), 'dfx.json');

	try {
		type DetailsId = {
			ic: string;
			staging?: string;
		};

		type Details = {
			remote?: {
				id: DetailsId;
			};
		};

		type DfxJson = {
			canisters: Record<string, Details>;
		};

		const { canisters }: DfxJson = JSON.parse(readFileSync(dfxJsonFile, 'utf8'));

		return Object.entries(canisters).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			if (canisterDetails.remote !== undefined) {
				const ids = Object.entries(canisterDetails.remote.id).reduce(
					(acc, [network, id]) => ({
						...acc,
						[`${prefix ?? ''}${network.toUpperCase()}_${canisterName
							.replaceAll('-', '_')
							.replaceAll("'", '')
							.toUpperCase()}_CANISTER_ID`]: id
					}),
					{}
				);

				return {
					...acc,
					...ids
				};
			}

			return acc;
		}, {});
	} catch (e) {
		console.warn(`Could not get canisters ID from ${dfxJsonFile}: ${e}`);
		return {};
	}
};

export const readCanisterIds = (params: { prefix?: string }): Record<string, string> => ({
	...readLocalCanisterIds(params),
	...readOisyCanisterIds(params),
	...readRemoteCanisterIds(params)
});
