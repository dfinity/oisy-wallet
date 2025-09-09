#!/usr/bin/env node

import { EnvAdditionalIcrcTokensSchema } from '$env/schema/env-additional-icrc-token.schema';
import type { EnvAdditionalIcrcTokensWithMetadata } from '$env/types/env-icrc-additional-token';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { isNullish, jsonReplacer, jsonReviver, nonNullish } from '@dfinity/utils';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMetadata, saveLogo } from './build.tokens.utils';
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
	const icrcTokensJson = JSON.parse(
		readFileSync(ADDITIONAL_ICRC_JSON_FILE).toString(),
		jsonReviver
	);

	const icrcTokensParsed = EnvAdditionalIcrcTokensSchema.safeParse(icrcTokensJson);

	if (!icrcTokensParsed.success) {
		throw new Error(`Error parsing tokens.icrc.json: ${icrcTokensParsed.error.message}`);
	}

	const { data: icrcTokens } = icrcTokensParsed;

	return await Object.entries(icrcTokens).reduce<Promise<TokensAndIcons>>(
		async (acc, [key, token]) => {
			if (isNullish(token)) {
				throw new Error(`Data is missing for token symbol ${key}.`);
			}

			const { ledgerCanisterId, indexCanisterId, ...rest } = token;

			if (isNullish(ledgerCanisterId)) {
				throw new Error(`Ledger canister ID is missing for token symbol ${key}.`);
			}

			const { tokens: accTokens, icons: accIcons } = await acc;

			const metadataWithIcon = await loadMetadata(ledgerCanisterId);

			if (isNullish(metadataWithIcon)) {
				return {
					tokens: {
						...accTokens,
						[key]: token
					},
					icons: accIcons
				};
			}

			const { icon, ...metadata } = metadataWithIcon;

			return {
				tokens: {
					...accTokens,
					[key]: {
						ledgerCanisterId,
						indexCanisterId,
						...rest,
						...metadata
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
	const logoName = name.toLowerCase();
	const file = join(LOGO_FOLDER, `${logoName}.svg`);

	if (existsSync(file)) {
		return;
	}

	saveLogo({ logoData, file, name });
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
