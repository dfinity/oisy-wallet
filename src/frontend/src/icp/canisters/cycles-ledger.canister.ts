import type { _SERVICE as CyclesLedgerService } from '$declarations/cycles_ledger/cycles_ledger.did';
import { idlFactory as idlCertifiedFactoryCyclesLedger } from '$declarations/cycles_ledger/cycles_ledger.factory.certified.did';
import { idlFactory as idlFactoryCyclesLedger } from '$declarations/cycles_ledger/cycles_ledger.factory.did';
import { mapCyclesLedgerWithdrawError } from '$icp/canisters/cycles-ledger.errors';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

export class CyclesLedgerCanister extends Canister<CyclesLedgerService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<CyclesLedgerService>): Promise<CyclesLedgerCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<CyclesLedgerService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryCyclesLedger,
			certifiedIdlFactory: idlCertifiedFactoryCyclesLedger
		});

		return new CyclesLedgerCanister(canisterId, service, certifiedService);
	}

	/**
	 * Burns `amount` plus the ledger fee from the caller's default account and deposits
	 * `amount` cycles into the canister `to`. The ledger records the canister in the
	 * burn's memo.
	 *
	 * `createdAt` lets the ledger recognise the same withdrawal sent again, which it
	 * answers as a duplicate instead of running it twice.
	 *
	 * @returns the index of the burn block.
	 * @throws {CyclesLedgerWithdrawError} with the ledger's answer.
	 */
	withdraw = async ({
		to,
		amount,
		createdAt
	}: {
		to: Principal;
		amount: bigint;
		createdAt: bigint;
	}): Promise<bigint> => {
		const { withdraw } = this.caller({ certified: true });

		const response = await withdraw({
			to,
			amount,
			from_subaccount: [],
			created_at_time: [createdAt]
		});

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapCyclesLedgerWithdrawError(response.Err);
	};
}
