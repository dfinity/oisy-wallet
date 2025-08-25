import type {
	AccountInfo,
	CommitmentLevel,
	DataSlice,
	GetAccountInfoEncoding,
	RpcSources,
	Slot,
	_SERVICE as SolRpcService,
	SolanaCluster
} from '$declarations/sol_rpc/sol_rpc.did';
import { idlFactory as idlCertifiedFactorySolRpc } from '$declarations/sol_rpc/sol_rpc.factory.certified.did';
import { idlFactory as idlFactorySolRpc } from '$declarations/sol_rpc/sol_rpc.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { SolAddress } from '$lib/types/address';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { JSON_PARSED, SOL_RPC_CONFIG } from '$sol/canisters/sol-rpc.constants';
import { SolRpcCanisterError, assertConsistentResponse } from '$sol/canisters/sol-rpc.errors';
import type { SolanaNetworkType } from '$sol/types/network';
import { Canister, createServices, fromNullable, toNullable } from '@dfinity/utils';

export const networkToCluster = (network: SolanaNetworkType): SolanaCluster => {
	if (network === 'devnet') {
		return { Devnet: null };
	}
	if (network === 'mainnet') {
		return { Mainnet: null };
	}
	if (network === 'local') {
		return { Mainnet: null };
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: never = network;

	throw new Error(`Unknown network: ${network}`);
};

const rpcSources = (network: SolanaNetworkType): RpcSources => ({
	Default: networkToCluster(network)
});

export class SolRpcCanister extends Canister<SolRpcService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<SolRpcService>): Promise<SolRpcCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SolRpcService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactorySolRpc,
			certifiedIdlFactory: idlCertifiedFactorySolRpc
		});

		return new SolRpcCanister(canisterId, service, certifiedService);
	}

	private baseParams: {
		encoding: [] | [GetAccountInfoEncoding];
		dataSlice: [] | [DataSlice];
		minContextSlot: [] | [Slot];
		commitment: [] | [CommitmentLevel];
	} = {
		encoding: JSON_PARSED,
		dataSlice: toNullable(),
		minContextSlot: toNullable(),
		commitment: toNullable()
	};

	getAccountInfo = async ({
		address: pubkey,
		network
	}: {
		address: SolAddress;
		network: SolanaNetworkType;
	}): Promise<AccountInfo | undefined> => {
		const { getAccountInfo } = this.caller({
			certified: true
		});

		const response = await getAccountInfo(rpcSources(network), SOL_RPC_CONFIG, {
			...this.baseParams,
			pubkey
		});

		assertConsistentResponse(response);

		const { Consistent: result } = response;

		if ('Ok' in result) {
			return fromNullable(result.Ok);
		}

		throw new SolRpcCanisterError(result.Err);
	};
}
