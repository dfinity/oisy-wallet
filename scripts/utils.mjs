import { HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { jsonReviver } from '@dfinity/utils';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pemfile from 'pem-file';

const SNS_JSON_FILE = join(process.cwd(), 'src', 'frontend', 'src', 'env', 'tokens.sns.json');
export const SNSES = JSON.parse((await readFile(SNS_JSON_FILE)).toString(), jsonReviver);

/**
 * Load identity from local PEM file
 */
export const loadLocalIdentity = async (pemFile) => {
	const rawKey = (await readFile(pemFile)).toString();

	const buf = pemfile.decode(rawKey);

	if (rawKey.includes('EC PRIVATE KEY')) {
		if (buf.length !== 118) {
			throw 'expecting byte length 118 but got ' + buf.length;
		}
		return Secp256k1KeyIdentity.fromSecretKey(buf.subarray(7, 39));
	}

	if (buf.length !== 85) {
		throw 'expecting byte length 85 but got ' + buf.length;
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
