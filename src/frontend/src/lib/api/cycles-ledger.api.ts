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
	HttpRequest,
	HttpResponse,
	MetadataValue,
	SupportedBlockType,
	SupportedStandard,
	TransferArgs,
	TransferError,
	TransferFromArgs,
	TransferFromError,
	WithdrawArgs
} from '$declarations/cycles_ledger/cycles_ledger.did';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { CyclesLedgerCanister } from '$lib/canisters/cycles-ledger.canister';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { IcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, toNullable, type QueryParams } from '@dfinity/utils';

// Assuming we'll add this to constants
const CYCLES_LEDGER_CANISTER_ID: LedgerCanisterIdText = 'um5iw-rqaaa-aaaaq-qaaba-cai';

let canister: CyclesLedgerCanister | undefined = undefined;

export const icrc1BalanceOf = async ({
	identity,
	account,
	certified
}: CanisterApiFunctionParams<
	{
		account: Account;
	} & QueryParams
>): Promise<bigint> => {
	const { icrc1BalanceOf } = await cyclesLedgerCanister({ identity });

	return icrc1BalanceOf({ account, certified });
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

export const icrc1Transfer = async ({
	identity,
	args
}: CanisterApiFunctionParams<{
	args: TransferArgs;
}>): Promise<{ Ok: BlockIndex } | { Err: TransferError }> => {
	const { icrc1Transfer } = await cyclesLedgerCanister({ identity });

	return icrc1Transfer(args);
};

export const icrc2Allowance = async ({
	identity,
	owner,
	spender
}: CanisterApiFunctionParams<
	{
		owner: IcrcAccount;
		spender: IcrcAccount;
	} & QueryParams
>): Promise<Allowance> => {
	const { icrc2Allowance } = await cyclesLedgerCanister({ identity });

	// should the API call simplifed by moving the args to the icrc2Allowance?
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

	return icrc2Allowance({ args });
};

export const icrc2Approve = async ({
	identity,
	args
}: CanisterApiFunctionParams<{
	args: {
		fee: [] | [bigint];
		memo: [] | [Uint8Array | number[]];
		from_subaccount: [] | [Uint8Array | number[]];
		created_at_time: [] | [bigint];
		amount: bigint;
		expected_allowance: [] | [bigint];
		expires_at: [] | [bigint];
		spender: Account;
	};
}>): Promise<{ Ok: bigint } | { Err: unknown }> => {
	const { icrc2Approve } = await cyclesLedgerCanister({ identity });

	return icrc2Approve(args);
};

export const icrc2TransferFrom = async ({
	identity,
	args
}: CanisterApiFunctionParams<{
	args: TransferFromArgs;
}>): Promise<{ Ok: bigint } | { Err: TransferFromError }> => {
	const { icrc2TransferFrom } = await cyclesLedgerCanister({ identity });

	return icrc2TransferFrom(args);
};

export const createCanister = async ({
	identity,
	args
}: CanisterApiFunctionParams<{
	args: CreateCanisterArgs;
}>): Promise<{ Ok: CreateCanisterSuccess } | { Err: unknown }> => {
	const { createCanister } = await cyclesLedgerCanister({ identity });

	return createCanister(args);
};

export const deposit = async ({
	identity,
	args
}: CanisterApiFunctionParams<{
	args: DepositArgs;
}>): Promise<DepositResult> => {
	const { deposit } = await cyclesLedgerCanister({ identity });

	return deposit(args);
};

export const withdraw = async ({
	identity,
	args
}: CanisterApiFunctionParams<{
	args: WithdrawArgs;
}>): Promise<{ Ok: BlockIndex } | { Err: unknown }> => {
	const { withdraw } = await cyclesLedgerCanister({ identity });

	return withdraw(args);
};

export const icrc3GetArchives = async ({
	identity,
	args,
	certified
}: CanisterApiFunctionParams<
	{
		args: GetArchivesArgs;
	} & QueryParams
>): Promise<GetArchivesResult> => {
	const { icrc3GetArchives } = await cyclesLedgerCanister({ identity });

	return icrc3GetArchives({ args, certified });
};

export const icrc3GetBlocks = async ({
	identity,
	args,
	certified
}: CanisterApiFunctionParams<
	{
		args: GetBlocksArgs;
	} & QueryParams
>): Promise<GetBlocksResult> => {
	const { icrc3GetBlocks } = await cyclesLedgerCanister({ identity });

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

export const icrc1SupportedStandards = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<Array<SupportedStandard>> => {
	const { icrc1SupportedStandards } = await cyclesLedgerCanister({ identity });

	return icrc1SupportedStandards({ certified });
};

export const httpRequest = async ({
	identity,
	request
}: CanisterApiFunctionParams<{
	request: HttpRequest;
}>): Promise<HttpResponse> => {
	const { httpRequest } = await cyclesLedgerCanister({ identity });

	return httpRequest(request);
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
