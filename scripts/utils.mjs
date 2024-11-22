import { HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { jsonReviver } from '@dfinity/utils';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pemfile from 'pem-file';
import { SNS_JSON_FILE } from './constants.mjs';

export const SNSES = JSON.parse((await readFile(SNS_JSON_FILE)).toString(), jsonReviver);

/**
 * Load identity from local PEM file
 */
export const loadLocalIdentity = async (pemFile) => {
	const rawKey = (await readFile(pemFile)).toString();

	const buf = pemfile.decode(rawKey);

	if (rawKey.includes('EC PRIVATE KEY')) {
		if (buf.length !== 118) {
			throw `expecting byte length 118 but got ${buf.length}`;
		}
		return Secp256k1KeyIdentity.fromSecretKey(buf.subarray(7, 39));
	}

	if (buf.length !== 85) {
		throw `expecting byte length 85 but got ${buf.length}`;
	}
	return Ed25519KeyIdentity.fromSecretKey(buf.subarray(16, 48));
};

/**
 * Init an agent to communicate with local replica
 */
export const localAgent = async ({ identity }) => {
	const agent = new HttpAgent({ identity, fetch, host: 'http://127.0.0.1:4943/' });
	await agent.fetchRootKey();

	return agent;
};

/**
 * Find all files in a directory. Optionally filter by extensions and ignore directories
 *
 * @param dir - directory to search
 * @param extensions - file extensions to include in the search (empty array means all files)
 * @param ignoreDirs - directories to ignore in the search (empty array means no directories are ignored)
 * @returns {*} - array of file paths found in the directory and subdirectories
 */
export const findFiles = ({ dir, extensions = [], ignoreDirs = [] }) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((file) => {
		const res = resolve(dir, file.name);
		return file.isDirectory()
			? ignoreDirs.includes(file.name)
				? []
				: findFiles({ dir: res, extensions, ignoreDirs })
			: file.isFile() && (extensions.length === 0 || extensions.some((ext) => res.endsWith(ext)))
				? [res]
				: [];
	});
