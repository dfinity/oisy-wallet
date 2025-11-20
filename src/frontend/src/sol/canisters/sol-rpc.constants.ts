import type {
	ConsensusStrategy,
	GetAccountInfoEncoding,
	RpcConfig
} from '$declarations/sol_rpc/sol_rpc.did';
import { toNullable } from '@dfinity/utils';

const SOL_RPC_CONSENSUS_STRATEGY: ConsensusStrategy = {
	Threshold: { min: 2, total: toNullable(3) }
};

export const SOL_RPC_CONFIG: [] | [RpcConfig] = toNullable({
	responseConsensus: toNullable(SOL_RPC_CONSENSUS_STRATEGY),
	responseSizeEstimate: toNullable()
});

export const JSON_PARSED: [] | [GetAccountInfoEncoding] = toNullable({ jsonParsed: null });
