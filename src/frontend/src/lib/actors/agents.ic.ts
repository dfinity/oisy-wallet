import { LOCAL, REPLICA_HOST } from '$lib/constants/app.constants';
import type { HttpAgent, Identity } from '@dfinity/agent';
import { AgentManager } from '@dfinity/utils';

export const agents = AgentManager.create({ fetchRootKey: LOCAL, host: REPLICA_HOST });

export const getAgent = async ({ identity }: { identity: Identity }): Promise<HttpAgent> => {};
