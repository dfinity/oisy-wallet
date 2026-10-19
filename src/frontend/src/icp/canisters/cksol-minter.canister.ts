import type {
	Address,
	_SERVICE as CkSolMinterService,
	DepositSolId,
	DepositSolStatus,
	Lamport,
	LedgerBurnIndex,
	MinterInfo,
	WithdrawSolOk,
	WithdrawSolStatus
} from '$declarations/cksol_minter/cksol_minter.did';
import { idlFactory as idlCertifiedFactoryCkSolMinter } from '$declarations/cksol_minter/cksol_minter.factory.certified.did';
import { idlFactory as idlFactoryCkSolMinter } from '$declarations/cksol_minter/cksol_minter.factory.did';
import { CkSolWithdrawSolError } from '$icp/canisters/cksol-minter.errors';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

export class CkSolMinterCanister extends Canister<CkSolMinterService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<CkSolMinterService>): Promise<CkSolMinterCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<CkSolMinterService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryCkSolMinter,
			certifiedIdlFactory: idlCertifiedFactoryCkSolMinter
		});

		return new CkSolMinterCanister(canisterId, service, certifiedService);
	}

	getMinterInfo = ({ certified }: QueryParams): Promise<MinterInfo> =>
		this.caller({ certified }).get_minter_info();

	/**
	 * The Solana address the minter derives for the owner's default account. The
	 * minter serves it as an update call only, so the answer is always certified.
	 */
	getDepositAddress = ({ owner }: { owner: Principal }): Promise<Address> =>
		this.caller({ certified: true }).get_deposit_address({ owner: [owner], subaccount: [] });

	depositSolStatus = ({
		depositId,
		certified
	}: { depositId: DepositSolId } & QueryParams): Promise<DepositSolStatus> =>
		this.caller({ certified }).deposit_sol_status(depositId);

	/**
	 * Burns `amount` lamports of ckSOL from the caller's default account, which the
	 * minter must already be approved to spend, and queues their transfer to
	 * `address`, minus the minter's withdrawal fee.
	 *
	 * @throws {CkSolWithdrawSolError} when the minter refuses, before anything is burned.
	 */
	withdrawSol = async ({
		address,
		amount
	}: {
		address: Address;
		amount: Lamport;
	}): Promise<WithdrawSolOk> => {
		const { withdraw_sol } = this.caller({ certified: true });

		const response = await withdraw_sol({ address, amount, from_subaccount: [] });

		if ('Ok' in response) {
			return response.Ok;
		}

		throw new CkSolWithdrawSolError(response.Err);
	};

	/**
	 * The minter serves this as an update call only, so the answer is always certified.
	 */
	withdrawSolStatus = ({
		blockIndex
	}: {
		blockIndex: LedgerBurnIndex;
	}): Promise<WithdrawSolStatus> =>
		this.caller({ certified: true }).withdraw_sol_status({ block_index: blockIndex });
}
