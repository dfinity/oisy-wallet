import type { SolanaNetworkType } from '$sol/types/network';
import { jsonReplacer, jsonReviver } from '@dfinity/utils';
import { createSolanaRpc, type Rpc, type SolanaRpcApi } from '@solana/kit';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FIXTURES_DIR = join(
	process.cwd(),
	'src',
	'frontend',
	'src',
	'tests',
	'fixtures',
	'solana',
	'rpc'
);

// Recording is opt-in because it is the only mode that reaches the network and rewrites fixtures.
const RECORD = process.env.SOL_RPC_FIXTURES_RECORD === 'true';

// Any mainnet RPC returns the same chain data, so recording does not need the Alchemy key that the
// application uses at runtime.
const RECORD_RPC_URL = process.env.SOL_RPC_FIXTURES_URL ?? 'https://api.mainnet-beta.solana.com';

const RECORD_ATTEMPTS = 5;

interface SolRpcFixtureFile {
	method: string;
	params: unknown[];
	response: unknown;
}

// The key must not depend on the order in which a caller happened to build a config object, nor on
// the bigint encoding, so both are normalised before hashing.
const normalize = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(normalize);
	}

	if (typeof value === 'bigint') {
		return `${value}`;
	}

	if (value !== null && typeof value === 'object') {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, unknown>>(
				(acc, key) => ({ ...acc, [key]: normalize((value as Record<string, unknown>)[key]) }),
				{}
			);
	}

	return value;
};

export const solRpcFixtureKey = ({
	method,
	params
}: {
	method: string;
	params: unknown[];
}): string =>
	createHash('sha256')
		.update(`${method}:${JSON.stringify(normalize(params))}`)
		.digest('hex')
		.slice(0, 32);

const fixturePath = ({
	network,
	method,
	params
}: {
	network: SolanaNetworkType;
	method: string;
	params: unknown[];
}): string => join(FIXTURES_DIR, network, method, `${solRpcFixtureKey({ method, params })}.json`);

const recordingRpcs = new Map<SolanaNetworkType, Rpc<SolanaRpcApi>>();

const recordingRpc = (network: SolanaNetworkType): Rpc<SolanaRpcApi> => {
	const existing = recordingRpcs.get(network);

	if (existing !== undefined) {
		return existing;
	}

	if (network !== 'mainnet') {
		throw new Error(`Recording Solana RPC fixtures is supported for mainnet only, got ${network}`);
	}

	const rpc = createSolanaRpc(RECORD_RPC_URL);

	recordingRpcs.set(network, rpc);

	return rpc;
};

const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

const record = async ({
	network,
	method,
	params,
	attempt = 0
}: {
	network: SolanaNetworkType;
	method: string;
	params: unknown[];
	attempt?: number;
}): Promise<unknown> => {
	const rpc = recordingRpc(network) as unknown as Record<
		string,
		(...args: unknown[]) => { send: () => Promise<unknown> }
	>;

	try {
		const response = await rpc[method](...params).send();

		const filePath = fixturePath({ network, method, params });

		mkdirSync(dirname(filePath), { recursive: true });

		writeFileSync(
			filePath,
			JSON.stringify({ method, params, response } satisfies SolRpcFixtureFile, jsonReplacer),
			'utf8'
		);

		return response;
	} catch (err: unknown) {
		if (attempt >= RECORD_ATTEMPTS - 1) {
			throw err;
		}

		// Public RPC endpoints throttle aggressively, so back off rather than lose the whole run.
		await wait(1000 * 2 ** attempt);

		return await record({ network, method, params, attempt: attempt + 1 });
	}
};

/**
 * A drop-in replacement for `solanaHttpRpc` that answers every call from a recorded fixture.
 *
 * It replaces the single boundary between the Solana code and the network, so everything above it
 * (the API layer, the signature and transaction services, and the mapping) runs for real.
 *
 * Run `npm run test:record:sol-fixtures` to refresh the fixtures against a live mainnet RPC.
 */
export const mockSolanaHttpRpcFromFixtures = (network: SolanaNetworkType): Rpc<SolanaRpcApi> =>
	new Proxy(
		{},
		{
			// The Proxy trap signature is fixed by the language.
			// eslint-disable-next-line local-rules/prefer-object-params
			get: (_target, property) => {
				if (typeof property !== 'string') {
					return;
				}

				return (...params: unknown[]) => ({
					send: async (): Promise<unknown> => {
						const filePath = fixturePath({ network, method: property, params });

						if (existsSync(filePath)) {
							const { response } = JSON.parse(
								readFileSync(filePath, 'utf8'),
								jsonReviver
							) as SolRpcFixtureFile;

							return response;
						}

						if (!RECORD) {
							throw new Error(
								`Missing Solana RPC fixture for ${property} on ${network} with params ${JSON.stringify(
									normalize(params)
								)}. Re-record with \`npm run test:record:sol-fixtures\`.`
							);
						}

						return await record({ network, method: property, params });
					}
				});
			}
		}
	) as Rpc<SolanaRpcApi>;
