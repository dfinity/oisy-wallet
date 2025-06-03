import type {
	Account,
	Allowance,
	AllowanceArgs,
	BlockIndex,
	CreateCanisterArgs,
	CreateCanisterSuccess,
	DataCertificate,
	DepositArgs,
	DepositResult,
	GetArchivesArgs,
	GetArchivesResult,
	GetBlocksArgs,
	GetBlocksResult,
	MetadataValue,
	SupportedBlockType,
	SupportedStandard,
	TransferArgs,
	TransferFromArgs,
	WithdrawArgs,
	WithdrawFromArgs
} from '$declarations/cycles_ledger/cycles_ledger.did';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { CyclesLedgerCanister } from '$lib/canisters/cycles-ledger.canister';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { IcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, toNullable, type QueryParams } from '@dfinity/utils';

// Cycles Ledger canister ID
const CYCLES_LEDGER_CANISTER_ID: LedgerCanisterIdText = 'um5iw-rqaaa-aaaaq-qaaba-cai';

let canister: CyclesLedgerCanister | undefined = undefined;

export const icrc1BalanceOf = async ({
	identity,
	account,
	certified
}: CanisterApiFunctionParams<
	{
		account: IcrcAccount;
	} & QueryParams
>): Promise<bigint> => {
	const { icrc1BalanceOf } = await cyclesLedgerCanister({ identity });

	const accountArgs: Account = {
		owner: account.owner,
		subaccount: toNullable(account.subaccount)
	};

	return icrc1BalanceOf({ account: accountArgs, certified });
};

export const icrc1Decimals = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<number> => {
	const { icrc1Decimals } = await cyclesLedgerCanister({ identity });

	return icrc1Decimals({ certified });
};

export const icrc1Fee = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<bigint> => {
	const { icrc1Fee } = await cyclesLedgerCanister({ identity });

	return icrc1Fee({ certified });
};

export const icrc1Metadata = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<Array<[string, MetadataValue]>> => {
	const { icrc1Metadata } = await cyclesLedgerCanister({ identity });

	return icrc1Metadata({ certified });
};

export const icrc1MintingAccount = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<[] | [Account]> => {
	const { icrc1MintingAccount } = await cyclesLedgerCanister({ identity });

	return icrc1MintingAccount({ certified });
};

export const icrc1Name = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<string> => {
	const { icrc1Name } = await cyclesLedgerCanister({ identity });

	return icrc1Name({ certified });
};

export const icrc1Symbol = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<string> => {
	const { icrc1Symbol } = await cyclesLedgerCanister({ identity });

	return icrc1Symbol({ certified });
};

export const icrc1TotalSupply = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<bigint> => {
	const { icrc1TotalSupply } = await cyclesLedgerCanister({ identity });

	return icrc1TotalSupply({ certified });
};

export const icrc1SupportedStandards = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<Array<SupportedStandard>> => {
	const { icrc1SupportedStandards } = await cyclesLedgerCanister({ identity });

	return icrc1SupportedStandards({ certified });
};

export const icrc1Transfer = async ({
	identity,
	fromSubaccount,
	to,
	amount,
	fee,
	memo,
	createdAtTime
}: CanisterApiFunctionParams<{
	fromSubaccount?: Uint8Array | number[];
	to: IcrcAccount;
	amount: bigint;
	fee?: bigint;
	memo?: Uint8Array | number[];
	createdAtTime?: bigint;
}>): Promise<BlockIndex> => {
	const { icrc1Transfer } = await cyclesLedgerCanister({ identity });

	const args: TransferArgs = {
		from_subaccount: toNullable(fromSubaccount),
		to: {
			owner: to.owner,
			subaccount: toNullable(to.subaccount)
		},
		amount,
		fee: toNullable(fee),
		memo: toNullable(memo),
		created_at_time: toNullable(createdAtTime ?? nowInBigIntNanoSeconds())
	};

	return icrc1Transfer(args);
};

export const icrc2Allowance = async ({
	identity,
	owner,
	spender,
	certified
}: CanisterApiFunctionParams<
	{
		owner: IcrcAccount;
		spender: IcrcAccount;
	} & QueryParams
>): Promise<Allowance> => {
	const { icrc2Allowance } = await cyclesLedgerCanister({ identity });

	const args: AllowanceArgs = {
		account: {
			owner: owner.owner,
			subaccount: toNullable(owner.subaccount)
		},
		spender: {
			owner: spender.owner,
			subaccount: toNullable(spender.subaccount)
		}
	};

	return icrc2Allowance({ args, certified });
};

export const icrc2Approve = async ({
	identity,
	fromSubaccount,
	spender,
	amount,
	expectedAllowance,
	expiresAt,
	fee,
	memo,
	createdAtTime
}: CanisterApiFunctionParams<{
	fromSubaccount?: Uint8Array | number[];
	spender: IcrcAccount;
	amount: bigint;
	expectedAllowance?: bigint;
	expiresAt?: bigint;
	fee?: bigint;
	memo?: Uint8Array | number[];
	createdAtTime?: bigint;
}>): Promise<bigint> => {
	const { icrc2Approve } = await cyclesLedgerCanister({ identity });

	const args = {
		from_subaccount: toNullable(fromSubaccount),
		spender: {
			owner: spender.owner,
			subaccount: toNullable(spender.subaccount)
		},
		amount,
		expected_allowance: toNullable(expectedAllowance),
		expires_at: toNullable(expiresAt),
		fee: toNullable(fee),
		memo: toNullable(memo),
		created_at_time: toNullable(createdAtTime)
	};

	return icrc2Approve(args);
};

export const icrc2TransferFrom = async ({
	identity,
	spenderSubaccount,
	from,
	to,
	amount,
	fee,
	memo,
	createdAtTime
}: CanisterApiFunctionParams<{
	spenderSubaccount?: Uint8Array | number[];
	from: IcrcAccount;
	to: IcrcAccount;
	amount: bigint;
	fee?: bigint;
	memo?: Uint8Array | number[];
	createdAtTime?: bigint;
}>): Promise<bigint> => {
	const { icrc2TransferFrom } = await cyclesLedgerCanister({ identity });

	const args: TransferFromArgs = {
		spender_subaccount: toNullable(spenderSubaccount),
		from: {
			owner: from.owner,
			subaccount: toNullable(from.subaccount)
		},
		to: {
			owner: to.owner,
			subaccount: toNullable(to.subaccount)
		},
		amount,
		fee: toNullable(fee),
		memo: toNullable(memo),
		created_at_time: toNullable(createdAtTime)
	};

	return icrc2TransferFrom(args);
};

export const createCanister = async ({
	identity,
	fromSubaccount,
	amount,
	createdAtTime
}: CanisterApiFunctionParams<{
	fromSubaccount?: Uint8Array | number[];
	amount: bigint;
	createdAtTime?: bigint;
}>): Promise<CreateCanisterSuccess> => {
	const { createCanister } = await cyclesLedgerCanister({ identity });

	const args: CreateCanisterArgs = {
		from_subaccount: toNullable(fromSubaccount),
		amount,
		created_at_time: toNullable(createdAtTime),
		creation_args: []
	};

	return createCanister(args);
};

export const deposit = async ({
	identity,
	to,
	memo
}: CanisterApiFunctionParams<{
	to: IcrcAccount;
	memo?: Uint8Array | number[];
}>): Promise<DepositResult> => {
	const { deposit } = await cyclesLedgerCanister({ identity });

	const args: DepositArgs = {
		to: {
			owner: to.owner,
			subaccount: toNullable(to.subaccount)
		},
		memo: toNullable(memo)
	};

	return deposit(args);
};

export const withdraw = async ({
	identity,
	fromSubaccount,
	amount,
	to,
	createdAtTime
}: CanisterApiFunctionParams<{
	fromSubaccount?: Uint8Array | number[];
	amount: bigint;
	to: Principal;
	createdAtTime?: bigint;
}>): Promise<bigint> => {
	const { withdraw } = await cyclesLedgerCanister({ identity });

	const args: WithdrawArgs = {
		from_subaccount: toNullable(fromSubaccount),
		amount,
		to,
		created_at_time: toNullable(createdAtTime)
	};

	return withdraw(args);
};

export const withdrawFrom = async ({
	identity,
	spenderSubaccount,
	fromAccount,
	amount,
	to,
	createdAtTime
}: CanisterApiFunctionParams<{
	spenderSubaccount?: Uint8Array | number[];
	fromAccount: IcrcAccount;
	amount: bigint;
	to: Principal;
	createdAtTime?: bigint;
}>): Promise<bigint> => {
	const { withdrawFrom } = await cyclesLedgerCanister({ identity });

	const args: WithdrawFromArgs = {
		spender_subaccount: toNullable(spenderSubaccount),
		from: {
			owner: fromAccount.owner,
			subaccount: toNullable(fromAccount.subaccount)
		},
		amount,
		to,
		created_at_time: toNullable(createdAtTime)
	};

	return withdrawFrom(args);
};

export const icrc3GetArchives = async ({
	identity,
	from,
	certified
}: CanisterApiFunctionParams<
	{
		from?: Principal;
	} & QueryParams
>): Promise<GetArchivesResult> => {
	const { icrc3GetArchives } = await cyclesLedgerCanister({ identity });

	const args: GetArchivesArgs = {
		from: toNullable(from)
	};

	return icrc3GetArchives({ args, certified });
};

export const icrc3GetBlocks = async ({
	identity,
	start,
	length,
	certified
}: CanisterApiFunctionParams<
	{
		start: bigint;
		length: bigint;
	} & QueryParams
>): Promise<GetBlocksResult> => {
	const { icrc3GetBlocks } = await cyclesLedgerCanister({ identity });

	const args: GetBlocksArgs = [
		{
			start,
			length
		}
	];

	return icrc3GetBlocks({ args, certified });
};

export const icrc3GetTipCertificate = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<[] | [DataCertificate]> => {
	const { icrc3GetTipCertificate } = await cyclesLedgerCanister({ identity });

	return icrc3GetTipCertificate({ certified });
};

export const icrc3SupportedBlockTypes = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<Array<SupportedBlockType>> => {
	const { icrc3SupportedBlockTypes } = await cyclesLedgerCanister({ identity });

	return icrc3SupportedBlockTypes({ certified });
};

const cyclesLedgerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = CYCLES_LEDGER_CANISTER_ID
}: CanisterApiFunctionParams): Promise<CyclesLedgerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await CyclesLedgerCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
