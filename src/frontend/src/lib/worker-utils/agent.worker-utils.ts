import { localIdentityCanisterId } from '$lib/constants/app.constants';
import { HttpAgent, type Identity } from '@dfinity/agent/lib/cjs/index';
import { nonNullish } from '@dfinity/utils';

export const getAgent = (params: { identity: Identity }): Promise<HttpAgent> => {
	if (nonNullish(localIdentityCanisterId)) {
		return getLocalAgent(params);
	}

	return getMainnetAgent(params);
};

const getMainnetAgent = async ({ identity }: { identity: Identity }): Promise<HttpAgent> => {
	const host = 'https://icp-api.io';
	return new HttpAgent({ identity, ...(host && { host }) });
};

const getLocalAgent = async ({ identity }: { identity: Identity }): Promise<HttpAgent> => {
	const host = 'http://localhost:4943/';

	const agent: HttpAgent = new HttpAgent({ identity, ...(host && { host }) });

	// Fetch root key for certificate validation during development
	await agent.fetchRootKey();

	return agent;
};
