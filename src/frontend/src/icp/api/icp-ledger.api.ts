import { IcpLedgerBlocksCanister } from '$icp/canisters/icp-ledger-blocks.canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import {
	assertNonNullish,
	nonNullish,
	nowInBigIntNanoSeconds,
	type QueryParams
} from '@dfinity/utils';
import {
	AccountIdentifier,
	IcpLedgerCanister,
	type BlockHeight
} from '@icp-sdk/canisters/ledger/icp';
import { toCandidAccount, type IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

export const accountBalance = async ({
	certified,
	owner,
	identity,
	...rest
}: {
	owner: Principal;
	identity: NullishIdentity;
	ledgerCanisterId: CanisterIdText;
} & QueryParams): Promise<bigint> => {
	assertNonNullish(identity);

	const { accountBalance } = await ledgerCanister({ identity, ...rest });

	return accountBalance({ certified, accountIdentifier: getAccountIdentifier(owner) });
};

export const transfer = async ({
	identity,
	to,
	amount,
	ledgerCanisterId
}: {
	identity: NullishIdentity;
	to: string;
	amount: bigint;
	ledgerCanisterId: CanisterIdText;
}): Promise<BlockHeight> => {
	assertNonNullish(identity);

	const { transfer } = await ledgerCanister({ identity, ledgerCanisterId });

	return transfer({
		to: AccountIdentifier.fromHex(to),
		amount
	});
};

export const icrc1Transfer = async ({
	identity,
	to,
	amount,
	createdAt,
	memo,
	ledgerCanisterId
}: {
	identity: NullishIdentity;
	to: IcrcAccount;
	amount: bigint;
	createdAt?: bigint;
	memo?: Uint8Array;
	ledgerCanisterId: CanisterIdText;
}): Promise<BlockHeight> => {
	assertNonNullish(identity);

	const { icrc1Transfer } = await ledgerCanister({ identity, ledgerCanisterId });

	return icrc1Transfer({
		to: toCandidAccount(to),
		amount,
		createdAt: createdAt ?? nowInBigIntNanoSeconds(),
		...(nonNullish(memo) && { icrc1Memo: memo })
	});
};

// When a block was appended, if the ledger still holds it rather than an archive.
export const getIcpLedgerBlockTimestamp = async ({
	identity,
	ledgerCanisterId,
	index,
	certified = true
}: QueryParams & {
	identity: NullishIdentity;
	ledgerCanisterId: CanisterIdText;
	index: bigint;
}): Promise<bigint | undefined> => {
	assertNonNullish(identity);

	const { blockTimestamp } = await IcpLedgerBlocksCanister.create({
		identity,
		canisterId: Principal.fromText(ledgerCanisterId)
	});

	return await blockTimestamp({ index, certified });
};

const ledgerCanister = async ({
	identity,
	ledgerCanisterId
}: {
	identity: Identity;
	ledgerCanisterId: CanisterIdText;
}): Promise<IcpLedgerCanister> => {
	const agent = await getAgent({ identity });

	return IcpLedgerCanister.create({
		agent,
		canisterId: Principal.fromText(ledgerCanisterId)
	});
};
