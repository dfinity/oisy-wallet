import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { AnonymousIdentity, HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister, mapTokenMetadata } from '@dfinity/ledger-icrc';
import type { IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc/dist/types/types/ledger.responses';
import { Principal } from '@dfinity/principal';
import { createAgent } from '@dfinity/utils';

export const agent: HttpAgent = await createAgent({
	identity: new AnonymousIdentity(),
	host: 'https://icp-api.io'
});

const getMetadata = async (ledgerCanisterId: Principal): Promise<IcrcTokenMetadataResponse> => {
	const { metadata } = IcrcLedgerCanister.create({
		agent,
		canisterId: ledgerCanisterId
	});

	return await metadata({ certified: true });
};

export const loadMetadata = async (
	ledgerCanisterId: LedgerCanisterIdText
): Promise<EnvIcrcTokenMetadataWithIcon | undefined> => {
	const metadata = await getMetadata(Principal.from(ledgerCanisterId));

	return mapTokenMetadata(metadata);
};
