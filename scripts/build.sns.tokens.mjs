import { IcrcMetadataResponseEntries } from '@dfinity/ledger-icrc';
import { fromNullable, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const AGGREGATOR_PAGE_SIZE = 10;
const SNS_AGGREGATOR_CANISTER_URL = 'https://3r4gx-wqaaa-aaaaq-aaaia-cai.icp0.io';
const AGGREGATOR_CANISTER_VERSION = 'v1';

const AGGREGATOR_URL = `${SNS_AGGREGATOR_CANISTER_URL}/${AGGREGATOR_CANISTER_VERSION}/sns`;

const DATA_FOLDER = join(process.cwd(), 'src', 'frontend', 'src', 'env');
const STATIC_FOLDER = join(process.cwd(), 'src', 'frontend', 'static', 'icons', 'sns');

if (!existsSync(DATA_FOLDER)) {
	mkdirSync(DATA_FOLDER, { recursive: true });
}

if (!existsSync(STATIC_FOLDER)) {
	mkdirSync(STATIC_FOLDER, { recursive: true });
}

const aggregatorPageUrl = (page) => `list/page/${page}/slow.json`;

const querySnsAggregator = async (page = 0) => {
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

const saveLogos = async (logos) => {
	const writeLogo = async ({ icon, ledgerCanisterId, rootCanisterId }) => {
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

	await Promise.all(logos.map(writeLogo));
};

const mapOptionalToken = (response) => {
	const nullishToken = response.reduce((acc, [key, value]) => {
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
						nonNullish(fromNullable(value.Nat)) && { fee: BigInt(fromNullable(value.Nat)) })
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

	if (
		isNullish(nullishToken.symbol) ||
		isNullish(nullishToken.name) ||
		isNullish(nullishToken.fee) ||
		isNullish(nullishToken.decimals)
	) {
		return undefined;
	}

	return nullishToken;
};

export const findSnses = async () => {
	try {
		const data = await querySnsAggregator();

		// 3 === Committed
		const snses = data.filter(
			({
				swap_state: {
					swap: { lifecycle }
				}
			}) => lifecycle === 3
		);

		const { tokens, icons } = snses
			.map(
				({
					canister_ids: { ledger_canister_id, index_canister_id, root_canister_id },
					icrc1_metadata,
					meta: { name: alternativeName, url, description }
				}) => ({
					ledgerCanisterId: ledger_canister_id,
					indexCanisterId: index_canister_id,
					rootCanisterId: root_canister_id,
					metadata: {
						...mapOptionalToken(icrc1_metadata),
						alternativeName,
						url,
						description
					}
				})
			)
			.filter(({ metadata }) => nonNullish(metadata))
			.reduce(
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

		writeFileSync(join(DATA_FOLDER, 'tokens.sns.json'), JSON.stringify(tokens, jsonReplacer));

		await saveLogos(icons);
	} catch (err) {
		throw new Error('Error querying Snses', err);
	}
};

await findSnses();
