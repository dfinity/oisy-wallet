import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { AnonymousIdentity, type HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister, mapTokenMetadata } from '@dfinity/ledger-icrc';
import type { IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc/dist/types/types/ledger.responses';
import { Principal } from '@dfinity/principal';
import { createAgent } from '@dfinity/utils';
import { closeSync, openSync, writeSync } from 'node:fs';

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

export const saveLogo = ({
	logoData,
	file,
	name
}: {
	logoData: string;
	file: string;
	name: string;
}) => {
	if (!logoData.includes(';') || !logoData.includes(',')) {
		console.error(`Invalid logoData format for ${name}: ${logoData}`);
		return;
	}

	if (!logoData.startsWith('data:image/svg+xml;base64,')) {
		const [logoDataPart1, logoDataPart2] = logoData.split(';');
		console.warn(
			`Invalid SVG logo format for ${name}:`,
			`${logoDataPart1};${logoDataPart2.split(',')[0]},...`
		);
		return;
	}

	const [encoding, encodedStr] = logoData.split(';')[1].split(',');

	const svgContent = Buffer.from(encodedStr, encoding as BufferEncoding).toString('utf-8');

	try {
		const fd = openSync(file, 'wx');

		writeSync(fd, svgContent, 0, 'utf-8');
		closeSync(fd);
	} catch (err: unknown) {
		if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'EEXIST') {
			// File already exists, do nothing
			return;
		}

		throw err;
	}
};
