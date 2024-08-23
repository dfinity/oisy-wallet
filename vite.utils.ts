import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCanisterIds as readIds } from './env.utils';

/**
 * Read all the locally deployed canister IDs. For example Oisy backend, ckBTC|ETH, ICP etc.
 * @param prefix
 */
const readLocalCanisterIds = ({ prefix }: { prefix?: string }): Record<string, string> => {
	const dfxCanisterIdsJsonFile = join(process.cwd(), '.dfx', 'local', 'canister_ids.json');
	const e2eCanisterIdsJsonFile = join(process.cwd(), 'canister_e2e_ids.json');
	return readIds({
		filePath: existsSync(dfxCanisterIdsJsonFile) ? dfxCanisterIdsJsonFile : e2eCanisterIdsJsonFile,
		prefix
	});
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

export const defineViteReplacements = (): {
	VITE_APP_VERSION: string;
	VITE_DFX_NETWORK: string;
} => {
	const file = fileURLToPath(new URL('package.json', import.meta.url));
	const json = readFileSync(file, 'utf8');
	const { version } = JSON.parse(json);

	// npm run dev = local
	// npm run build = local
	// npm run test = local
	// dfx deploy = local
	// dfx deploy --network ic = ic
	// dfx deploy --network staging = staging
	const network = process.env.DFX_NETWORK ?? 'local';

	return {
		VITE_APP_VERSION: JSON.stringify(version),
		VITE_DFX_NETWORK: JSON.stringify(network)
	};
};
