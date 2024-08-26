import { readFileSync } from 'node:fs';

/**
 * Read a JSON file with canister IDs and transform it into a dictionary. Optionally add prefix to all dictionary keys.
 */
export const readCanisterIds = ({
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
