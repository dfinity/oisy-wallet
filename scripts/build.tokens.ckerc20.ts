#!/usr/bin/env node

import type {
	EnvCkErc20TokenData,
	EnvCkErc20Tokens,
	EnvCkErc20TokensRaw,
	EnvTokensCkErc20
} from '$env/types/env-token-ckerc20';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { AnonymousIdentity, HttpAgent } from '@dfinity/agent';
import {
	CkETHOrchestratorCanister,
	type ManagedCanisters,
	type OrchestratorInfo
} from '@dfinity/cketh';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { createAgent, fromNullable, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CK_ERC20_JSON_FILE } from './constants.mjs';

const agent: HttpAgent = await createAgent({
	identity: new AnonymousIdentity(),
	host: 'https://icp-api.io'
});

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

const buildOrchestratorInfo = async (orchestratorId: Principal): Promise<EnvCkErc20Tokens> => {
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

	return Object.entries(tokens).reduce(
		(acc, [key, value]) => ({
			...acc,
			[key]: value[0]
		}),
		{}
	);
};

const ORCHESTRATOR_STAGING_ID: Principal = Principal.fromText('2s5qh-7aaaa-aaaar-qadya-cai');
const ORCHESTRATOR_PRODUCTION_ID: Principal = Principal.fromText('vxkom-oyaaa-aaaar-qafda-cai');

const LOGO_FOLDER = join(process.cwd(), 'src', 'frontend', 'src', 'icp-eth', 'assets');

const saveTokenLogo = async ({
	canisterId,
	name
}: {
	canisterId: Principal;
	name: EnvTokenSymbol;
}) => {
	const logoName = name.toLowerCase().replace('ck', '').replace('sepolia', '');
	const file = join(LOGO_FOLDER, `${logoName}.svg`);

	if (existsSync(file)) {
		return;
	}

	const { metadata } = IcrcLedgerCanister.create({
		agent,
		canisterId
	});

	const data = await metadata({ certified: true });

	const logoItem = data.find((item) => item[0] === 'icrc1:logo');

	if (isNullish(logoItem) || !('Text' in logoItem[1])) {
		const error = new Error(`No 'icrc1:logo' data found for ${name}`);
		console.warn(error.stack);
		return;
	}

	const logoData = logoItem[1].Text;

	const [encoding, encodedStr] = logoData.split(';')[1].split(',');

	const svgContent = Buffer.from(encodedStr, encoding as BufferEncoding).toString('utf-8');

	writeFileSync(file, svgContent, 'utf-8');
};

const findCkErc20 = async () => {
	const [staging, production]: EnvCkErc20Tokens[] = await Promise.all(
		[ORCHESTRATOR_STAGING_ID, ORCHESTRATOR_PRODUCTION_ID].map(buildOrchestratorInfo)
	);

	const tokens: EnvTokensCkErc20 = {
		production,
		staging
	};

	writeFileSync(CK_ERC20_JSON_FILE, JSON.stringify(tokens, jsonReplacer, 8));

	await Promise.allSettled(
		Object.entries({
			...tokens.production,
			...tokens.staging
		})
			.filter(
				([, token]) =>
					nonNullish(token) && !SKIP_CANISTER_IDS_LOGOS.includes(token.ledgerCanisterId)
			)
			.map(
				([name, token]) =>
					nonNullish(token?.ledgerCanisterId) &&
					saveTokenLogo({ canisterId: Principal.from(token.ledgerCanisterId), name })
			)
	);
};

try {
	await findCkErc20();
} catch (err) {
	console.error(err);
}
