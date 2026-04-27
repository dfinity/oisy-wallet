#!/usr/bin/env node

import type {
	EnvCkErc20TokenData,
	EnvCkErc20TokensRaw,
	EnvCkErc20TokensWithMetadata,
	EnvTokensCkErc20
} from '$env/types/env-token-ckerc20';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { fromNullable, isNullish, jsonReplacer, jsonReviver, nonNullish } from '@dfinity/utils';
import { CkEthOrchestratorCanister, type CkEthOrchestratorDid } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agent, loadMetadata, saveIcon } from './build.tokens.utils';
import { CK_ERC20_JSON_FILE } from './constants.mjs';

interface TokensAndIcons {
	tokens: EnvCkErc20TokensWithMetadata;
	icons: {
		ledgerCanisterId: LedgerCanisterIdText;
		name: EnvTokenSymbol;
		icon: string;
	}[];
}

// Tokens for which the ERC20 and ckERC20 logos are different—i.e., tokens that are presented with their original ERC20 logos but have a custom logo for ckERC20.
const SKIP_CANISTER_IDS_LOGOS: LedgerCanisterIdText[] = [
	// ckUSDC
	'xevnm-gaaaa-aaaar-qafnq-cai',
	// ckUSDT
	'cngnf-vqaaa-aaaar-qag4q-cai',
	// ckSepoliaUSDC
	'yfumr-cyaaa-aaaar-qaela-cai',
	// ckEURC
	'pe5t5-diaaa-aaaar-qahwa-cai',
	// ckXAUT
	'nza5v-qaaaa-aaaar-qahzq-cai'
];

const orchestratorInfo = async ({
	orchestratorId: canisterId
}: {
	orchestratorId: Principal;
}): Promise<CkEthOrchestratorDid.OrchestratorInfo> => {
	const { getOrchestratorInfo } = CkEthOrchestratorCanister.create({
		agent,
		canisterId
	});

	return await getOrchestratorInfo({ certified: true });
};

const buildOrchestratorInfo = async (orchestratorId: Principal): Promise<TokensAndIcons> => {
	const { managed_canisters } = await orchestratorInfo({ orchestratorId });

	// eslint-disable-next-line local-rules/prefer-object-params -- This is a destructuring assignment
	const mapManagedCanisters = (
		acc: EnvCkErc20TokensRaw,
		{
			ledger,
			index,
			ckerc20_token_symbol,
			erc20_contract: { address: erc20ContractAddress }
		}: CkEthOrchestratorDid.ManagedCanisters
	): EnvCkErc20TokensRaw => {
		const ledgerCanister = fromNullable(ledger);
		const indexCanister = fromNullable(index);

		// Skip tokens without Ledger or Index (by definition, this can happen).
		if (isNullish(ledgerCanister) || isNullish(indexCanister)) {
			return acc;
		}

		const { canister_id: ledgerCanisterId } =
			'Created' in ledgerCanister ? ledgerCanister.Created : ledgerCanister.Installed;
		const { canister_id: indexCanisterId } =
			'Created' in indexCanister ? indexCanister.Created : indexCanister.Installed;

		return {
			...acc,
			[ckerc20_token_symbol]: [
				...(acc[ckerc20_token_symbol] ?? []),
				{
					ledgerCanisterId: ledgerCanisterId.toText(),
					indexCanisterId: indexCanisterId.toText(),
					erc20ContractAddress
				}
			]
		};
	};

	const tokens: EnvCkErc20TokensRaw = managed_canisters.reduce<EnvCkErc20TokensRaw>(
		mapManagedCanisters,
		{}
	);

	const assertUniqueTokenSymbol: EnvCkErc20TokenData[] | undefined = Object.values(tokens).find(
		(value) => value.length > 1
	);

	if (assertUniqueTokenSymbol !== undefined) {
		throw new Error(
			`More than one pair of ledger and index canisters were used for the token symbol ${assertUniqueTokenSymbol}.`
		);
	}

	return await Object.entries(tokens).reduce<Promise<TokensAndIcons>>(
		async (acc, [key, value]) => {
			const { tokens: accTokens, icons: accIcons } = await acc;

			const [token] = value;

			const { ledgerCanisterId, ...rest } = token;

			const metadataWithIcon = await loadMetadata(ledgerCanisterId);

			if (isNullish(metadataWithIcon)) {
				return { tokens: accTokens, icons: accIcons };
			}

			const { icon, ...metadata } = metadataWithIcon;

			return {
				tokens: {
					...accTokens,
					[key]: { ledgerCanisterId, ...rest, ...metadata }
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

const ORCHESTRATOR_STAGING_ID: Principal = Principal.fromText('2s5qh-7aaaa-aaaar-qadya-cai');
const ORCHESTRATOR_PRODUCTION_ID: Principal = Principal.fromText('vxkom-oyaaa-aaaar-qafda-cai');

const LOGO_FOLDER = join(process.cwd(), 'src', 'frontend', 'src', 'icp-eth', 'assets');

const saveTokenLogo = ({ name, logoData }: { name: EnvTokenSymbol; logoData: string }) => {
	if (!logoData.startsWith('data:image/svg+xml;')) {
		const mimeMatch = logoData.match(/^data:([^;]+);/);

		console.warn(`Non-SVG logo for ${name}, skipping (MIME: ${mimeMatch?.[1] ?? 'unknown'})`);

		return;
	}

	const logoName = name.toLowerCase().replace('ck', '').replace('sepolia', '');

	saveIcon({ logoData, destDir: LOGO_FOLDER, fileName: logoName, name });
};

type EnvTokenTags = EnvCkErc20TokensWithMetadata[string]['tags'];
type EnvTagsRecord = Record<string, Record<string, EnvTokenTags>>;
type EnvGroupDataIdRecord = Record<string, Record<string, string>>;

interface EnvCuratedData {
	tags: EnvTagsRecord;
	groupDataIds: EnvGroupDataIdRecord;
}

const readExistingCkErc20CuratedData = (): EnvCuratedData => {
	if (!existsSync(CK_ERC20_JSON_FILE)) {
		return {
			tags: {},
			groupDataIds: {}
		};
	}

	try {
		const existing = JSON.parse(readFileSync(CK_ERC20_JSON_FILE, 'utf8'), jsonReviver) as Record<
			string,
			Record<string, { tags?: EnvTokenTags; groupDataId?: string }>
		>;

		return Object.entries(existing).reduce<EnvCuratedData>(
			(envAcc, [env, tokens]) => {
				const envTags: Record<string, EnvTokenTags> = {};
				const envGroupDataIds: Record<string, string> = {};

				Object.entries(tokens).forEach(([symbol, data]) => {
					if (nonNullish(data?.tags)) {
						envTags[symbol] = data.tags;
					}
					if (nonNullish(data?.groupDataId)) {
						envGroupDataIds[symbol] = data.groupDataId;
					}
				});

				if (Object.keys(envTags).length > 0) {
					envAcc.tags[env] = envTags;
				}

				if (Object.keys(envGroupDataIds).length > 0) {
					envAcc.groupDataIds[env] = envGroupDataIds;
				}

				return envAcc;
			},
			{
				tags: {},
				groupDataIds: {}
			}
		);
	} catch (err: unknown) {
		console.error(
			`Failed to parse existing CK ERC20 curated data from ${CK_ERC20_JSON_FILE}. Aborting to avoid losing curated data.`,
			err
		);
		throw err;
	}
};

const mergeCuratedData = ({
	tokens,
	envTags,
	envGroupDataIds
}: {
	tokens: EnvCkErc20TokensWithMetadata;
	envTags: Record<string, EnvTokenTags> | undefined;
	envGroupDataIds: Record<string, string> | undefined;
}): EnvCkErc20TokensWithMetadata =>
	Object.fromEntries(
		Object.entries(tokens).map(([symbol, data]) => [
			symbol,
			{
				...data,
				...(nonNullish(envTags?.[symbol]) && { tags: envTags[symbol] }),
				...(nonNullish(envGroupDataIds?.[symbol]) && { groupDataId: envGroupDataIds[symbol] })
			}
		])
	);

const findCkErc20 = async () => {
	const { tags: existingTags, groupDataIds: existingGroupDataIds } =
		readExistingCkErc20CuratedData();

	const [
		{ tokens: staging, icons: stagingIcons },
		{ tokens: production, icons: productionIcons }
	]: TokensAndIcons[] = await Promise.all(
		[ORCHESTRATOR_STAGING_ID, ORCHESTRATOR_PRODUCTION_ID].map(buildOrchestratorInfo)
	);

	const tokens: EnvTokensCkErc20 = {
		production: mergeCuratedData({
			tokens: production,
			envTags: existingTags['production'],
			envGroupDataIds: existingGroupDataIds['production']
		}),
		staging: mergeCuratedData({
			tokens: staging,
			envTags: existingTags['staging'],
			envGroupDataIds: existingGroupDataIds['staging']
		})
	};

	writeFileSync(CK_ERC20_JSON_FILE, JSON.stringify(tokens, jsonReplacer, 8));

	await Promise.allSettled(
		[...productionIcons, ...stagingIcons]
			.filter(({ ledgerCanisterId }) => !SKIP_CANISTER_IDS_LOGOS.includes(ledgerCanisterId))
			.map(({ name, icon }) => saveTokenLogo({ name, logoData: icon }))
	);
};

try {
	await findCkErc20();
} catch (err) {
	console.error(err);
}
