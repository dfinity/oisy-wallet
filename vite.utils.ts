import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'vite';
import { readCanisterIds as readIds } from './env.utils';
import OISY_DOMAINS from './scripts/domains.json' with { type: 'json' };

/**
 * Get the domain URL for a given DFX network
 * @param dfx_network - The DFX network name (e.g., 'ic', 'staging', 'beta', etc.)
 * @returns The domain URL for the network, or a default URL if not found
 */
const domain_for_dfx_network = (dfx_network: string): string => {
	if (dfx_network === 'local') {
		return 'http://localhost:4943';
	}
	const map = OISY_DOMAINS.frontend as Record<string, string>;
	return map[dfx_network] ?? `https://${dfx_network}.oisy.com`;
};

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
		interface DetailsId {
			ic: string;
			beta?: string;
			staging?: string;
		}

		interface Details {
			remote?: {
				id: DetailsId;
			};
		}

		interface DfxJson {
			canisters: Record<string, Details>;
		}

		const { canisters }: DfxJson = JSON.parse(readFileSync(dfxJsonFile, 'utf8'));

		return Object.entries(canisters).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			if (canisterDetails.remote !== undefined) {
				const ids = Object.entries(canisterDetails.remote.id).reduce(
					(acc, [network, id]) => ({
						...acc,
						[`${prefix ?? ''}${network.toUpperCase().replaceAll('-', '_')}_${canisterName
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
	VITE_OISY_DOMAIN: string;
	VITE_APP_VERSION: string;
	VITE_DFX_NETWORK: string;
	VITE_GIT_COMMIT_HASH: string;
	VITE_GIT_BRANCH_NAME: string;
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

	const isTestFe = network.startsWith('test_fe_');

	const commitHash = isTestFe ? execSync('git rev-parse --short HEAD').toString().trim() : '';
	const branchName = isTestFe ? execSync('git rev-parse --abbrev-ref HEAD').toString().trim() : '';

	console.log(domain_for_dfx_network(network));

	return {
		VITE_OISY_DOMAIN: JSON.stringify(domain_for_dfx_network(network)),
		VITE_APP_VERSION: JSON.stringify(version),
		VITE_DFX_NETWORK: JSON.stringify(network),
		VITE_GIT_COMMIT_HASH: JSON.stringify(commitHash),
		VITE_GIT_BRANCH_NAME: JSON.stringify(branchName)
	};
};

export const CSS_CONFIG_OPTIONS: Pick<UserConfig, 'css'> = {
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler'
			}
		}
	}
};
