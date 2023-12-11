import { LOCAL } from '$lib/constants/app.constants';
import type { HttpAgent, Identity } from '@dfinity/agent';
import { createAgent as createAgentUtils, isNullish } from '@dfinity/utils';

let agents: Record<string, HttpAgent> | undefined | null = undefined;

export const getAgent = async ({ identity }: { identity: Identity }): Promise<HttpAgent> => {
	const key = identity.getPrincipal().toText();

	if (isNullish(agents) || isNullish(agents[key])) {
		const agent = await createAgent({ identity });

		agents = {
			...(agents ?? {}),
			[key]: agent
		};

		return agent;
	}

	return agents[key];
};

const createAgent = ({ identity }: { identity: Identity }): Promise<HttpAgent> =>
	createAgentUtils({
		identity,
		fetchRootKey: LOCAL,
		host: LOCAL ? 'http://localhost:4943/' : 'https://icp-api.io',
		verifyQuerySignatures: false
	});

export const clearAgents = () => (agents = null);
