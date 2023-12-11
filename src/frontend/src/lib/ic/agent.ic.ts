import { getAgent as getAgentUtils } from '$lib/utils/agent.utils';
import type { HttpAgent, Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';

let agents: Record<string, HttpAgent> | undefined | null = undefined;

export const getAgent = async ({ identity }: { identity: Identity }): Promise<HttpAgent> => {
	const key = identity.getPrincipal().toText();

	if (isNullish(agents) || isNullish(agents[key])) {
		const agent = await getAgentUtils({ identity });

		agents = {
			...(agents ?? {}),
			[key]: agent
		};

		return agent;
	}

	return agents[key];
};

export const clearAgents = () => (agents = null);
