#!/usr/bin/env node

import type {
	EnvCkErc20TokenData,
	EnvCkErc20TokensRaw,
	EnvCkErc20TokensWithMetadata,
	EnvTokensCkErc20
} from '$env/types/env-token-ckerc20';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import {
	CkETHOrchestratorCanister,
	type ManagedCanisters,
	type OrchestratorInfo
} from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';
import { fromNullable, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agent, loadMetadata, saveLogo } from './build.tokens.utils';
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
}): Promise<OrchestratorInfo> => {
	const { getOrchestratorInfo } = CkETHOrchestratorCanister.create({
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
		}: ManagedCanisters
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
	const logoName = name.toLowerCase().replace('ck', '').replace('sepolia', '');
	const file = join(LOGO_FOLDER, `${logoName}.svg`);

	if (existsSync(file)) {
		return;
	}

	saveLogo({ logoData, file, name });
};

const findCkErc20 = async () => {
	const [
		{ tokens: staging, icons: stagingIcons },
		{ tokens: production, icons: productionIcons }
	]: TokensAndIcons[] = await Promise.all(
		[ORCHESTRATOR_STAGING_ID, ORCHESTRATOR_PRODUCTION_ID].map(buildOrchestratorInfo)
	);

	const tokens: EnvTokensCkErc20 = {
		production,
		staging
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
