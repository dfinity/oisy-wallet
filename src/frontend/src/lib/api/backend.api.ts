import { getBackendActor } from '$lib/utils/actor.utils';

export const getEthAddress = async (): Promise<string> => {
	const actor = await getBackendActor();
	return actor.caller_eth_address();
};
