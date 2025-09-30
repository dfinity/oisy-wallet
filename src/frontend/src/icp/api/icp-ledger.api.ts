import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { AccountIdentifier, LedgerCanister, type BlockHeight } from '@dfinity/ledger-icp';
import type { IcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, toNullable } from '@dfinity/utils';

export const transfer = async ({
	identity,
	to,
	amount,
	ledgerCanisterId
}: {
	identity: OptionIdentity;
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
	ledgerCanisterId
}: {
	identity: OptionIdentity;
	to: IcrcAccount;
	amount: bigint;
	createdAt?: bigint;
	ledgerCanisterId: CanisterIdText;
}): Promise<BlockHeight> => {
	assertNonNullish(identity);

	const { icrc1Transfer } = await ledgerCanister({ identity, ledgerCanisterId });

	return icrc1Transfer({
		to: {
			owner: to.owner,
			subaccount: toNullable(to.subaccount)
		},
		amount,
		createdAt: createdAt ?? nowInBigIntNanoSeconds()
	});
};

const ledgerCanister = async ({
	identity,
	ledgerCanisterId
}: {
	identity: Identity;
	ledgerCanisterId: CanisterIdText;
}): Promise<LedgerCanister> => {
	const agent = await getAgent({ identity });

	return LedgerCanister.create({
		agent,
		canisterId: Principal.fromText(ledgerCanisterId)
	});
};
