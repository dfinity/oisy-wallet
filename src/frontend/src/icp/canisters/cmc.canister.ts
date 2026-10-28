import type { _SERVICE as CmcService, NotifyMintCyclesSuccess } from '$declarations/cmc/cmc.did';
import { idlFactory as idlCertifiedFactoryCmc } from '$declarations/cmc/cmc.factory.certified.did';
import { idlFactory as idlFactoryCmc } from '$declarations/cmc/cmc.factory.did';
import { mapCmcNotifyError } from '$icp/canisters/cmc.errors';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';

export class CmcCanister extends Canister<CmcService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<CmcService>): Promise<CmcCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<CmcService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryCmc,
			certifiedIdlFactory: idlCertifiedFactoryCmc
		});

		return new CmcCanister(canisterId, service, certifiedService);
	}

	/**
	 * The rate the CMC mints at, in 10,000ths of an XDR per ICP. One XDR mints
	 * 10¹² cycles, so an amount in e8s times this rate is the cycles it mints.
	 */
	getIcpXdrConversionRate = async ({ certified }: QueryParams): Promise<bigint> => {
		const {
			data: { xdr_permyriad_per_icp }
		} = await this.caller({ certified }).get_icp_xdr_conversion_rate();

		return xdr_permyriad_per_icp;
	};

	/**
	 * Asks the CMC to mint cycles for an ICP deposit, into the caller's default
	 * cycles-ledger account. Only the principal the deposit account is derived
	 * from can notify it.
	 *
	 * @throws {CmcNotifyError} with `retryable` telling whether notifying the
	 * same block again can still mint.
	 */
	notifyMintCycles = async ({
		blockIndex
	}: {
		blockIndex: bigint;
	}): Promise<NotifyMintCyclesSuccess> => {
		const { notify_mint_cycles } = this.caller({ certified: true });

		const response = await notify_mint_cycles({
			block_index: blockIndex,
			to_subaccount: [],
			deposit_memo: []
		});

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapCmcNotifyError(response.Err);
	};
}
