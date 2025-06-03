import type {
	_SERVICE as CyclesLedgerService,
	Account,
	Allowance,
	AllowanceArgs,
	CreateCanisterArgs,
	DataCertificate,
	DepositArgs,
	DepositResult,
	GetArchivesArgs,
	GetArchivesResult,
	GetBlocksArgs,
	GetBlocksResult,
	HttpRequest,
	HttpResponse,
	MetadataValue,
	SupportedBlockType,
	SupportedStandard,
	TransferArgs,
	TransferFromArgs,
	WithdrawArgs,
	WithdrawFromArgs
} from '$declarations/cycles_ledger/cycles_ledger.did';
import { idlFactory as idlCertifiedFactoryCyclesLedger } from '$declarations/cycles_ledger/cycles_ledger.factory.certified.did';
import { idlFactory as idlFactoryCyclesLedger } from '$declarations/cycles_ledger/cycles_ledger.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import {
	mapApproveError,
	mapCreateCanisterError,
	mapTransferError,
	mapTransferFromError,
	mapWithdrawError,
	mapWithdrawFromError
} from '$lib/canisters/cycles-ledger.errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';

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

	icrc1BalanceOf = ({
		account,
		certified = true
	}: { account: Account } & QueryParams): Promise<bigint> => {
		const { icrc1_balance_of } = this.caller({ certified });
		return icrc1_balance_of(account);
	};

	icrc1Decimals = ({ certified = true }: QueryParams): Promise<number> => {
		const { icrc1_decimals } = this.caller({ certified });
		return icrc1_decimals();
	};

	icrc1Fee = ({ certified = true }: QueryParams): Promise<bigint> => {
		const { icrc1_fee } = this.caller({ certified });
		return icrc1_fee();
	};

	icrc1Metadata = ({ certified = true }: QueryParams): Promise<Array<[string, MetadataValue]>> => {
		const { icrc1_metadata } = this.caller({ certified });
		return icrc1_metadata();
	};

	icrc1MintingAccount = ({ certified = true }: QueryParams): Promise<[] | [Account]> => {
		const { icrc1_minting_account } = this.caller({ certified });
		return icrc1_minting_account();
	};

	icrc1Name = ({ certified = true }: QueryParams): Promise<string> => {
		const { icrc1_name } = this.caller({ certified });
		return icrc1_name();
	};

	icrc1Symbol = ({ certified = true }: QueryParams): Promise<string> => {
		const { icrc1_symbol } = this.caller({ certified });
		return icrc1_symbol();
	};

	icrc1TotalSupply = ({ certified = true }: QueryParams): Promise<bigint> => {
		const { icrc1_total_supply } = this.caller({ certified });
		return icrc1_total_supply();
	};

	icrc1SupportedStandards = ({
		certified = true
	}: QueryParams): Promise<Array<SupportedStandard>> => {
		const { icrc1_supported_standards } = this.caller({ certified });
		return icrc1_supported_standards();
	};

	icrc1Transfer = async (args: TransferArgs) => {
		const { icrc1_transfer } = this.caller({ certified: true });
		const result = await icrc1_transfer(args);

		if ('Ok' in result) {
			return result;
		}

		// Map the error using the error mapping function
		throw mapTransferError(result.Err);
	};

	icrc2Allowance = ({
		args,
		certified
	}: {
		args: AllowanceArgs;
	} & QueryParams): Promise<Allowance> => {
		const { icrc2_allowance } = this.caller({ certified });
		return icrc2_allowance(args);
	};

	icrc2Approve = async (args: {
		fee: [] | [bigint];
		memo: [] | [Uint8Array | number[]];
		from_subaccount: [] | [Uint8Array | number[]];
		created_at_time: [] | [bigint];
		amount: bigint;
		expected_allowance: [] | [bigint];
		expires_at: [] | [bigint];
		spender: Account;
	}) => {
		const { icrc2_approve } = this.caller({ certified: true });
		const result = await icrc2_approve(args);

		if ('Ok' in result) {
			return result;
		}

		throw mapApproveError(result.Err);
	};

	icrc2TransferFrom = async (args: TransferFromArgs) => {
		const { icrc2_transfer_from } = this.caller({ certified: true });
		const result = await icrc2_transfer_from(args);

		if ('Ok' in result) {
			return result;
		}

		throw mapTransferFromError(result.Err);
	};

	createCanister = async (args: CreateCanisterArgs) => {
		const { create_canister } = this.caller({ certified: true });
		const result = await create_canister(args);

		if ('Ok' in result) {
			return result;
		}

		throw mapCreateCanisterError(result.Err);
	};

	deposit = async (args: DepositArgs): Promise<DepositResult> => {
		const { deposit } = this.caller({ certified: true });
		return await deposit(args);
	};

	withdraw = async (args: WithdrawArgs) => {
		const { withdraw } = this.caller({ certified: true });
		const result = await withdraw(args);

		if ('Ok' in result) {
			return result;
		}

		throw mapWithdrawError(result.Err);
	};

	withdrawFrom = async (args: WithdrawFromArgs) => {
		const { withdraw_from } = this.caller({ certified: true });
		const result = await withdraw_from(args);

		if ('Ok' in result) {
			return result;
		}

		throw mapWithdrawFromError(result.Err);
	};

	icrc3GetArchives = ({
		args,
		certified = true
	}: {
		args: GetArchivesArgs;
	} & QueryParams): Promise<GetArchivesResult> => {
		const { icrc3_get_archives } = this.caller({ certified });
		return icrc3_get_archives(args);
	};

	icrc3GetBlocks = ({
		args,
		certified = true
	}: { args: GetBlocksArgs } & QueryParams): Promise<GetBlocksResult> => {
		const { icrc3_get_blocks } = this.caller({ certified });
		return icrc3_get_blocks(args);
	};

	icrc3GetTipCertificate = ({ certified = true }: QueryParams): Promise<[] | [DataCertificate]> => {
		const { icrc3_get_tip_certificate } = this.caller({ certified });
		return icrc3_get_tip_certificate();
	};

	icrc3SupportedBlockTypes = ({
		certified = true
	}: QueryParams): Promise<Array<SupportedBlockType>> => {
		const { icrc3_supported_block_types } = this.caller({ certified });
		return icrc3_supported_block_types();
	};

	httpRequest = (request: HttpRequest): Promise<HttpResponse> => {
		const { http_request } = this.caller({ certified: false });
		return http_request(request);
	};
}
