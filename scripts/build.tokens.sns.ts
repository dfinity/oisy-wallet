#!/usr/bin/env node

import type { EnvIcrcTokenMetadata } from '$env/types/env-icrc-token';
import type { EnvSnsToken } from '$env/types/env-sns-token';
import type { CanisterIdText } from '$lib/types/canister';
import { IcrcMetadataResponseEntries } from '@dfinity/ledger-icrc';
import {
	candidNumberArrayToBigInt,
	fromNullable,
	isNullish,
	jsonReplacer,
	nonNullish
} from '@dfinity/utils';
import { UrlSchema } from '@dfinity/zod-schemas';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { SNS_JSON_FILE } from './constants.mjs';

const AGGREGATOR_PAGE_SIZE = 10;
const SNS_AGGREGATOR_CANISTER_URL = 'https://3r4gx-wqaaa-aaaaq-aaaia-cai.icp0.io';
const AGGREGATOR_CANISTER_VERSION = 'v1';

const AGGREGATOR_URL = `${SNS_AGGREGATOR_CANISTER_URL}/${AGGREGATOR_CANISTER_VERSION}/sns`;

const DATA_FOLDER = join(process.cwd(), 'src', 'frontend', 'src', 'env');
const STATIC_FOLDER = join(process.cwd(), 'src', 'frontend', 'static', 'icons', 'sns');

interface ResponseData {
	canister_ids: {
		ledger_canister_id: CanisterIdText;
		index_canister_id: CanisterIdText;
		root_canister_id: CanisterIdText;
	};
	icrc1_metadata: [[string, { Text: string } | { Nat: [number] }]];
	meta: { name: string; url: z.infer<typeof UrlSchema> };
	swap_state: {
		swap: { lifecycle: number };
	};
}

type SnsMetadata = EnvSnsToken & {
	metadata: EnvIcrcTokenMetadata & { icon?: string };
};

type TokenMetadata = SnsMetadata['metadata'];

type OptionalTokenMetadata = Partial<TokenMetadata>;

type Logo = Pick<SnsMetadata, 'ledgerCanisterId' | 'rootCanisterId'> & Pick<TokenMetadata, 'icon'>;

if (!existsSync(DATA_FOLDER)) {
	mkdirSync(DATA_FOLDER, { recursive: true });
}

if (!existsSync(STATIC_FOLDER)) {
	mkdirSync(STATIC_FOLDER, { recursive: true });
}

const aggregatorPageUrl = (page: number): string => `list/page/${page}/slow.json`;

const querySnsAggregator = async (page = 0): Promise<ResponseData[]> => {
	const response = await fetch(`${AGGREGATOR_URL}/${aggregatorPageUrl(page)}`);

	if (!response.ok) {
		// If the error is after the first page, is because there are no more pages it fails
		if (page > 0) {
			return [];
		}

		throw new Error('Error loading SNS projects from aggregator canister');
	}

	const data = await response.json();

	if (data.length === AGGREGATOR_PAGE_SIZE) {
		const nextPageData = await querySnsAggregator(page + 1);
		return [...data, ...nextPageData];
	}

	return data;
};

const saveLogos = async (logos: Logo[]) => {
	const writeLogo = async ({ icon, ledgerCanisterId, rootCanisterId }: Logo) => {
		// Use ledger icon and fallback on Sns icon if not existing
		const response = await fetch(
			nonNullish(icon) ? icon : `${AGGREGATOR_URL}/root/${rootCanisterId}/logo.png`
		);

		const blob = await response.blob();

		writeFileSync(
			join(STATIC_FOLDER, `${ledgerCanisterId}.png`),
			Buffer.from(await blob.arrayBuffer())
		);
	};

	const activeSnsLogos = logos.filter(({ rootCanisterId }) =>
		isNullish(DEPRECATED_SNES[rootCanisterId])
	);

	await Promise.all(activeSnsLogos.map(writeLogo));
};

const mapOptionalToken = (response: ResponseData['icrc1_metadata']): TokenMetadata => {
	const nullishToken = response.reduce<OptionalTokenMetadata>((acc, [key, value]) => {
		switch (key) {
			case IcrcMetadataResponseEntries.SYMBOL:
				acc = { ...acc, ...('Text' in value && { symbol: value.Text }) };
				break;
			case IcrcMetadataResponseEntries.NAME:
				acc = { ...acc, ...('Text' in value && { name: value.Text }) };
				break;
			case IcrcMetadataResponseEntries.FEE:
				acc = {
					...acc,
					...('Nat' in value &&
						nonNullish(fromNullable(value.Nat)) && { fee: candidNumberArrayToBigInt(value.Nat) })
				};
				break;
			case IcrcMetadataResponseEntries.DECIMALS:
				acc = {
					...acc,
					...('Nat' in value && { decimals: Number(value.Nat) })
				};
				break;
			case IcrcMetadataResponseEntries.LOGO:
				acc = { ...acc, ...('Text' in value && { icon: value.Text }) };
		}

		return acc;
	}, {});

	const { symbol, name, fee, decimals, ...rest } = nullishToken;

	if (isNullish(symbol) || isNullish(name) || isNullish(fee) || isNullish(decimals)) {
		throw new Error(`Missing token metadata: ${JSON.stringify(response)}`);
	}

	return {
		decimals,
		name,
		symbol,
		fee,
		...rest
	};
};

// 3 === Committed
const filterCommittedSns = ({
	swap_state: {
		swap: { lifecycle }
	}
}: ResponseData) => lifecycle === 3;

const mapSnsMetadata = ({
	canister_ids: { ledger_canister_id, index_canister_id, root_canister_id },
	icrc1_metadata,
	meta: { name: alternativeName, url }
}: ResponseData): SnsMetadata => {
	const tokenMetadata = mapOptionalToken(icrc1_metadata);

	return {
		ledgerCanisterId: ledger_canister_id,
		indexCanisterId: index_canister_id,
		rootCanisterId: root_canister_id,
		...(nonNullish(tokenMetadata) && {
			metadata: {
				...tokenMetadata,
				alternativeName: alternativeName.trim(),
				url
			}
		})
	};
};

const DEPRECATED_SNES: Record<string, OptionalTokenMetadata> = {
	['ibahq-taaaa-aaaaq-aadna-cai']: {
		name: '---- (formerly CYCLES-TRANSFER-STATION)',
		symbol: '--- (CTS)',
		alternativeName: undefined,
		url: undefined,
		icon: undefined
	}
};

const mapDeprecatedSnsMetadata = ({
	metadata,
	rootCanisterId,
	...rest
}: SnsMetadata): SnsMetadata => ({
	metadata: {
		...metadata,
		...(nonNullish(DEPRECATED_SNES[rootCanisterId]) && DEPRECATED_SNES[rootCanisterId])
	},
	rootCanisterId,
	...rest
});

const findSnses = async () => {
	const data = await querySnsAggregator();

	const snses = data.filter(filterCommittedSns);

	const { tokens, icons } = snses
		.map(mapSnsMetadata)
		.filter(({ metadata }) => nonNullish(metadata))
		.map(mapDeprecatedSnsMetadata)
		.reduce<{ tokens: SnsMetadata[]; icons: Logo[] }>(
			(
				{ tokens, icons },
				{ metadata: { icon, ...metadata }, ledgerCanisterId, rootCanisterId, ...rest }
			) => ({
				tokens: [
					...tokens,
					{
						ledgerCanisterId,
						rootCanisterId,
						...rest,
						metadata
					}
				],
				icons: [
					...icons,
					{
						ledgerCanisterId,
						rootCanisterId,
						icon
					}
				]
			}),
			{ tokens: [], icons: [] }
		);

	writeFileSync(SNS_JSON_FILE, JSON.stringify(tokens, jsonReplacer, 8));

	await saveLogos(icons);
};

try {
	await findSnses();
} catch (err) {
	console.error(err);
	process.exit(1);
}
