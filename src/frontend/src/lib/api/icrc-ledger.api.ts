import { getAgent } from '$lib/ic/agent.ic';
import type { CanisterIdText } from '$lib/types/canister';
import { AnonymousIdentity, type Identity } from '@dfinity/agent';
import type { IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';

export const metadata = async (params: {
	ledgerCanisterId: CanisterIdText;
}): Promise<IcrcTokenMetadataResponse> => {
	const { metadata } = await ledgerCanister({ identity: new AnonymousIdentity(), ...params });

	return metadata({ certified: false });
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
