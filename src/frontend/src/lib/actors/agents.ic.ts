import { LOCAL, REPLICA_HOST } from '$lib/constants/app.constants';
import { AgentManager } from '@dfinity/utils';

const agents = AgentManager.create({ fetchRootKey: LOCAL, host: REPLICA_HOST });

export const { getAgent } = agents;
