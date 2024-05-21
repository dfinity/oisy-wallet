#!/usr/bin/env node

import { AnonymousIdentity } from '@dfinity/agent';
import { CkETHOrchestratorCanister } from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';
import { createAgent, fromNullable, isNullish } from '@dfinity/utils';

const orchestratorInfo = async ({ orchestratorId: canisterId }) => {
	const agent = await createAgent({
		identity: new AnonymousIdentity(),
		host: 'https://icp-api.io'
	});

	const { getOrchestratorInfo } = CkETHOrchestratorCanister.create({
		agent,
		canisterId
	});

	return getOrchestratorInfo({ certified: true });
};

const buildOrchestratorInfo = async (orchestratorId) => {
	const { managed_canisters } = await orchestratorInfo({ orchestratorId });

	const mapManagedCanisters = ({ ledger, index, ckerc20_token_symbol }) => {
		const ledgerCanister = fromNullable(ledger);
		const indexCanister = fromNullable(index);

		if (isNullish(ledgerCanister) || isNullish(indexCanister)) {
			return undefined;
		}

		const { canister_id: ledgerCanisterId } =
			'Created' in ledgerCanister ? ledgerCanister.Created : ledgerCanister.Installed;
		const { canister_id: indexCanisterId } =
			'Created' in indexCanister ? indexCanister.Created : indexCanister.Installed;

		return {
			ledgerCanisterId: ledgerCanisterId.toText(),
			indexCanisterId: indexCanisterId.toText(),
			ckerc20_token_symbol
		};
	};

	return managed_canisters.map(mapManagedCanisters);
};

const ORCHESTRATOR_STAGING_ID = Principal.fromText('2s5qh-7aaaa-aaaar-qadya-cai');
const ORCHESTRATOR_PRODUCTION_ID = Principal.fromText('vxkom-oyaaa-aaaar-qafda-cai');

const findCkErc20 = async () => {
	const [staging, production] = await Promise.all(
		[ORCHESTRATOR_STAGING_ID, ORCHESTRATOR_PRODUCTION_ID].map(buildOrchestratorInfo)
	);

	console.log(staging, production);
};

try {
	await findCkErc20();
} catch (err) {
	console.error(err);
}
