#!/usr/bin/env node

import { EnvAdditionalIcrcTokensSchema } from '$env/schema/env-additional-icrc-token.schema';
import icrcTokensJson from '$env/tokens/tokens.icrc.json';
import type { EnvAdditionalIcrcTokensWithMetadata } from '$env/types/env-icrc-additional-token';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import { closeSync, existsSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { loadMetadata } from './build.tokens.utils';
import { ADDITIONAL_ICRC_JSON_FILE } from './constants.mjs';

interface TokensAndIcons {
	tokens: EnvAdditionalIcrcTokensWithMetadata;
	icons: {
		ledgerCanisterId: LedgerCanisterIdText;
		name: EnvTokenSymbol;
		icon: string;
	}[];
}

const buildIcrcTokens = async (): Promise<TokensAndIcons> => {
	const icrcTokensParsed = EnvAdditionalIcrcTokensSchema.safeParse(icrcTokensJson);

	const icrcTokens = icrcTokensParsed.success ? icrcTokensParsed.data : {};

	return await Object.entries(icrcTokens).reduce<Promise<TokensAndIcons>>(
		async (acc, [key, token]) => {
			if (isNullish(token)) {
				throw new Error(`Data is missing for token symbol ${key}.`);
			}

			const { ledgerCanisterId: savedLedgerCanisterId, indexCanisterId: savedIndexCanisterId } =
				token;

			if (isNullish(savedLedgerCanisterId) || isNullish(savedIndexCanisterId)) {
				throw new Error(`Ledger or index canister ID is missing for token symbol ${key}.`);
			}

			const { tokens: accTokens, icons: accIcons } = await acc;

			const valueWithMetadata = await loadMetadata(token);

			if (isNullish(valueWithMetadata)) {
				return {
					tokens: {
						...accTokens,
						[key]: token
					},
					icons: accIcons
				};
			}

			const { ledgerCanisterId, name, icon, ...rest } = valueWithMetadata;

			if (ledgerCanisterId !== savedLedgerCanisterId) {
				throw new Error(
					`Ledger canister ID mismatch for token symbol ${key}. Expected ${savedLedgerCanisterId}, got ${ledgerCanisterId}.`
				);
			}

			return {
				tokens: {
					...accTokens,
					[key]: {
						ledgerCanisterId,
						name,
						...rest,
						// We override the metadata index canister ID with the one from the saved JSON, in case we want to use a particular one that is not the official one
						indexCanisterId: savedIndexCanisterId
					}
				},
				icons: [
					...accIcons,
					...(nonNullish(icon)
						? [
								{
									ledgerCanisterId,
									name: key,
									icon
								}
							]
						: [])
				]
			};
		},
		Promise.resolve({ tokens: {}, icons: [] })
	);
};

const LOGO_FOLDER = join(process.cwd(), 'src', 'frontend', 'src', 'icp', 'assets');

const saveTokenLogo = ({ name, logoData }: { name: EnvTokenSymbol; logoData: string }) => {
	const file = join(LOGO_FOLDER, `${name}.svg`);

	if (existsSync(file)) {
		return;
	}

	// Open the file for writing only if it does not already exist (wx flag).
	// This avoids a potential file system race condition warning.
	const fd = openSync(file, 'wx');

	const [encoding, encodedStr] = logoData.split(';')[1].split(',');

	const svgContent = Buffer.from(encodedStr, encoding as BufferEncoding).toString('utf-8');

	writeSync(fd, svgContent, 0, 'utf-8');
	closeSync(fd);
};

const findAdditionalIcrc = async () => {
	const { tokens, icons }: TokensAndIcons = await buildIcrcTokens();

	writeFileSync(ADDITIONAL_ICRC_JSON_FILE, JSON.stringify(tokens, jsonReplacer, 8));

	await Promise.allSettled(icons.map(({ name, icon }) => saveTokenLogo({ name, logoData: icon })));
};

try {
	await findAdditionalIcrc();
} catch (err) {
	console.error(err);
}
