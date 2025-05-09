import type { _SERVICE as XtcLedgerService } from '$declarations/xtc_ledger/xtc_ledger.did';
import { idlFactory as idlCertifiedFactoryXtcLedger } from '$declarations/xtc_ledger/xtc_ledger.factory.certified.did';
import { idlFactory as idlFactoryXtcLedger } from '$declarations/xtc_ledger/xtc_ledger.factory.did';
import { mapXtcLedgerCanisterError } from '$icp/canisters/xtc-ledger.errors';
import type { XtcLedgerTransferParams } from '$icp/types/xtc-ledger';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import type { Principal } from '@dfinity/principal';
import { Canister, createServices } from '@dfinity/utils';

export class XtcLedgerCanister extends Canister<XtcLedgerService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<XtcLedgerService>): Promise<XtcLedgerCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<XtcLedgerService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryXtcLedger,
			certifiedIdlFactory: idlCertifiedFactoryXtcLedger
		});

		return new XtcLedgerCanister(canisterId, service, certifiedService);
	}

	/**
	 * Transfers XTC tokens from the sender to the given principal.
	 *
	 * @param {XtcLedgerTransferParams} params The parameters to transfer XTC tokens.
	 *
	 * @throws {Error} If the transfer fails.
	 */
	transfer = async ({ to, amount }: XtcLedgerTransferParams): Promise<bigint> => {
		const { transfer } = this.caller({ certified: true });
		const response = await transfer(to, amount);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapXtcLedgerCanisterError(response.Err);
	};

	/**
	 * Balance of the given principal.
	 *
	 * @param {Principal} account The Principal to check the balance of.
	 *
	 * @throws {Error} If the request fails.
	 */
	balance = (account: Principal): Promise<bigint> =>
		this.caller({ certified: true }).balanceOf(account);
}
