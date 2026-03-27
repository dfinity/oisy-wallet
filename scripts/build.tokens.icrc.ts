#!/usr/bin/env node

import { EnvAdditionalIcrcTokensSchema } from '$env/schema/env-additional-icrc-token.schema';
import type { EnvAdditionalIcrcTokensWithMetadata } from '$env/types/env-icrc-additional-token';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { isNullish, jsonReplacer, jsonReviver, nonNullish } from '@dfinity/utils';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getIndexPrincipal, getMintingAccount, loadMetadata, saveIcon } from './build.tokens.utils';
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

			const { ledgerCanisterId, indexCanisterId: originalIndexCanisterId, ...rest } = token;

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

			const putativeIndexCanisterPrincipal = await getIndexPrincipal(ledgerCanisterId);

			const indexCanisterId = nonNullish(putativeIndexCanisterPrincipal)
				? putativeIndexCanisterPrincipal.toText()
				: originalIndexCanisterId;

			const mintingAccount = await getMintingAccount(ledgerCanisterId);

			return {
				tokens: {
					...accTokens,
					[key]: {
						ledgerCanisterId,
						...(nonNullish(indexCanisterId) ? { indexCanisterId } : {}),
						...(nonNullish(mintingAccount)
							? { mintingAccount: encodeIcrcAccount(mintingAccount) }
							: {}),
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

const STATIC_ICONS_FOLDER = join(process.cwd(), 'src', 'frontend', 'static', 'icons', 'icrc');

const saveTokenIcon = ({
	ledgerCanisterId,
	icon,
	name
}: {
	ledgerCanisterId: LedgerCanisterIdText;
	icon: string;
	name: EnvTokenSymbol;
}): string | undefined => {
	const ext = saveIcon({
		logoData: icon,
		destDir: STATIC_ICONS_FOLDER,
		fileName: ledgerCanisterId,
		name
	});

	if (isNullish(ext)) {
		return;
	}

	return `/icons/icrc/${ledgerCanisterId}.${ext}`;
};

const findAdditionalIcrc = async () => {
	const { tokens, icons }: TokensAndIcons = await buildIcrcTokens();

	const iconPaths = icons.reduce<Record<LedgerCanisterIdText, string>>(
		(acc, { ledgerCanisterId, name, icon }) => {
			const iconPath = saveTokenIcon({ ledgerCanisterId, icon, name });

			if (nonNullish(iconPath)) {
				acc[ledgerCanisterId] = iconPath;
			}

			return acc;
		},
		{}
	);

	const tokensWithIcons = Object.fromEntries(
		Object.entries(tokens).map(([key, { icon: _, ...token }]) => {
			const iconPath = iconPaths[token.ledgerCanisterId];

			return [key, nonNullish(iconPath) ? { ...token, icon: iconPath } : token];
		})
	);

	writeFileSync(ADDITIONAL_ICRC_JSON_FILE, JSON.stringify(tokensWithIcons, jsonReplacer, 8));
};

try {
	await findAdditionalIcrc();
} catch (err) {
	console.error(err);
}
