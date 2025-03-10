import type { EnvIcToken, EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import { AnonymousIdentity, HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister, mapTokenMetadata } from '@dfinity/ledger-icrc';
import type { IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc/dist/types/types/ledger.responses';
import { Principal } from '@dfinity/principal';
import { createAgent, isNullish } from '@dfinity/utils';

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

export const loadMetadata = async <T extends EnvIcToken>(
	token: T
): Promise<(T & EnvIcrcTokenMetadataWithIcon) | undefined> => {
	const { ledgerCanisterId } = token;

	const metadata = await getMetadata(Principal.from(ledgerCanisterId));

	const mappedMetadata = mapTokenMetadata(metadata);

	if (isNullish(mappedMetadata)) {
		return;
	}

	return {
		...token,
		...mappedMetadata
	};
};
