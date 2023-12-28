import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const readCanisterIds = ({
	prefix,
	network
}: {
	prefix?: string;
	network: string;
}): Record<string, string> => {
	const canisterIdsJsonFile = ['ic', 'staging'].includes(network)
		? join(process.cwd(), 'canister_ids.json')
		: join(process.cwd(), '.dfx', 'local', 'canister_ids.json');

	try {
		type Details = {
			ic?: string;
			staging?: string;
			local?: string;
		};

		const config: Record<string, Details> = JSON.parse(readFileSync(canisterIdsJsonFile, 'utf-8'));

		return Object.entries(config).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			return {
				...acc,
				[`${prefix ?? ''}${canisterName.toUpperCase()}_CANISTER_ID`]:
					canisterDetails[network as keyof Details]
			};
		}, {});
	} catch (e) {
		console.warn(`Could not get canister ID from ${canisterIdsJsonFile}: ${e}`);
		return {};
	}
};

export const dfxCanisterIds = ({
	prefix,
	network
}: {
	prefix?: string;
	network: string;
}): Record<string, string> => {
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

		const { canisters }: DfxJson = JSON.parse(readFileSync(dfxJsonFile, 'utf-8'));

		return Object.entries(canisters).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			if (canisterDetails.remote !== undefined) {
				const value = canisterDetails.remote.id[network as keyof DetailsId];

				if (value === undefined) {
					return acc;
				}

				return {
					...acc,
					[`${prefix ?? ''}${canisterName
						.replaceAll('-', '_')
						.replaceAll("'", '')
						.toUpperCase()}_CANISTER_ID`]: canisterDetails.remote.id[network as keyof DetailsId]
				};
			}

			return acc;
		}, {});
	} catch (e) {
		console.warn(`Could not get canisters ID from ${dfxJsonFile}: ${e}`);
		return {};
	}
};
