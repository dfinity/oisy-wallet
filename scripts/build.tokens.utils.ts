import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { createAgent, fromDefinedNullable, isNullish } from '@dfinity/utils';
import {
	IcrcLedgerCanister,
	fromCandidAccount,
	mapTokenMetadata,
	type IcrcAccount,
	type IcrcTokenMetadataResponse
} from '@icp-sdk/canisters/ledger/icrc';
import { AnonymousIdentity, type HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

export const getIndexPrincipal = async (
	ledgerCanisterId: LedgerCanisterIdText
): Promise<Principal | undefined> => {
	const { getIndexPrincipal } = IcrcLedgerCanister.create({
		agent,
		canisterId: Principal.from(ledgerCanisterId)
	});

	try {
		return await getIndexPrincipal({ certified: true });
	} catch (_: unknown) {
		// This method is just to get the index principal if the token supports the method `icrc106_get_index_principal`.
		// So if it fails, we do not really care and consider it as not supported.
	}
};

export const getMintingAccount = async (
	ledgerCanisterId: LedgerCanisterIdText
): Promise<IcrcAccount | undefined> => {
	const { getMintingAccount } = IcrcLedgerCanister.create({
		agent,
		canisterId: Principal.from(ledgerCanisterId)
	});

	try {
		const account = await getMintingAccount({ certified: true });

		return fromCandidAccount(fromDefinedNullable(account));
	} catch (_: unknown) {
		// This method is just to get the minting account.
		// So if it fails, we do not really care and consider it as non-existent.
	}
};

const MIME_TO_EXT: Record<string, string> = {
	'image/svg+xml': 'svg',
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif'
};

/**
 * Saves an icon from any data URI format (SVG, PNG, JPEG, WebP, GIF) to the
 * given directory. Returns the file extension on success, or undefined if the
 * data URI is invalid or has an unsupported MIME type.
 */
export const saveIcon = ({
	logoData,
	destDir,
	fileName,
	name
}: {
	logoData: string;
	destDir: string;
	fileName: string;
	name: string;
}): string | undefined => {
	const mimeMatch = logoData.match(/^data:([^;]+);base64,/);

	if (isNullish(mimeMatch)) {
		console.error(`Invalid or non-base64 data URI for ${name}: ${logoData.substring(0, 60)}...`);

		return;
	}

	const [, mime] = mimeMatch;

	const ext = MIME_TO_EXT[mime];

	if (isNullish(ext)) {
		console.warn(`Unsupported image MIME type for ${name}: ${mime}`);

		return;
	}

	if (!existsSync(destDir)) {
		mkdirSync(destDir, { recursive: true });
	}

	const filePath = join(destDir, `${fileName}.${ext}`);

	if (existsSync(filePath)) {
		return ext;
	}

	const [, encodedStr] = logoData.split(',');

	const buffer = Buffer.from(encodedStr, 'base64');

	writeFileSync(filePath, buffer);

	return ext;
};
