import type { _SERVICE as IcpLedgerService } from '$declarations/icp_ledger/icp_ledger.did';
import { idlFactory as idlCertifiedFactoryIcpLedger } from '$declarations/icp_ledger/icp_ledger.factory.certified.did';
import { idlFactory as idlFactoryIcpLedger } from '$declarations/icp_ledger/icp_ledger.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, nonNullish, type QueryParams } from '@dfinity/utils';

// The ICP ledger's blocks themselves. The `IcpLedgerCanister` of `@icp-sdk/canisters` only
// transfers and reads balances.
export class IcpLedgerBlocksCanister extends Canister<IcpLedgerService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<IcpLedgerService>): Promise<IcpLedgerBlocksCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<IcpLedgerService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryIcpLedger,
			certifiedIdlFactory: idlCertifiedFactoryIcpLedger
		});

		return new IcpLedgerBlocksCanister(canisterId, service, certifiedService);
	}

	/**
	 * When a block was appended, in nanoseconds since the epoch, if the ledger still holds
	 * the block itself. `undefined` for a block it has already moved to an archive, whose
	 * time only the archive canister knows, and for one beyond its chain.
	 */
	blockTimestamp = async ({
		index,
		certified
	}: { index: bigint } & QueryParams): Promise<bigint | undefined> => {
		const {
			blocks: [block],
			first_block_index
		} = await this.caller({ certified }).query_blocks({ start: index, length: 1n });

		// `first_block_index` is unspecified when no block came back.
		return nonNullish(block) && first_block_index === index
			? block.timestamp.timestamp_nanos
			: undefined;
	};
}
