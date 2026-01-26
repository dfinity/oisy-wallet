import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish } from '@dfinity/utils';
import {
	AccountIdentifier,
	IcpLedgerCanister,
	type BlockHeight
} from '@icp-sdk/canisters/ledger/icp';
import { toCandidAccount, type IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

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
		to: toCandidAccount(to),
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
}): Promise<IcpLedgerCanister> => {
	const agent = await getAgent({ identity });

	return IcpLedgerCanister.create({
		agent,
		canisterId: Principal.fromText(ledgerCanisterId)
	});
};
