import { getAgent } from '$lib/ic/agent.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { AnonymousIdentity, type Identity } from '@dfinity/agent';
import type { IcrcAccount, IcrcBlockIndex, IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, toNullable } from '@dfinity/utils';

export const metadata = async (params: {
	ledgerCanisterId: CanisterIdText;
}): Promise<IcrcTokenMetadataResponse> => {
	const { metadata } = await ledgerCanister({ identity: new AnonymousIdentity(), ...params });

	return metadata({ certified: false });
};

export const transfer = async ({
	identity,
	to,
	amount,
	ledgerCanisterId
}: {
	identity: OptionIdentity;
	to: IcrcAccount;
	amount: bigint;
	ledgerCanisterId: CanisterIdText;
}): Promise<IcrcBlockIndex> => {
	assertNonNullish(identity, 'No internet identity.');

	const { transfer } = await ledgerCanister({ identity, ledgerCanisterId });

	return transfer({
		to: {
			owner: to.owner,
			subaccount: toNullable(to.subaccount)
		},
		amount
	});
};

const ledgerCanister = async ({
	identity,
	ledgerCanisterId
}: {
	identity: Identity;
	ledgerCanisterId: CanisterIdText;
}): Promise<IcrcLedgerCanister> => {
	const agent = await getAgent({ identity });

	return IcrcLedgerCanister.create({
		agent,
		canisterId: Principal.fromText(ledgerCanisterId)
	});
};
