#!/usr/bin/env node

import { HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { ICManagementCanister, InstallMode } from '@dfinity/ic-management';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';
import { jsonReviver } from '@dfinity/utils';
import { copyFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pemfile from 'pem-file';

await copyFile(
	'./node_modules/@dfinity/ledger-icrc/dist/candid/icrc_ledger.idl.js',
	'./node_modules/@dfinity/ledger-icrc/dist/candid/icrc_ledger.idl.mjs'
);
const { init: initLedger } = await import(
	'../node_modules/@dfinity/ledger-icrc/dist/candid/icrc_ledger.idl.mjs'
);

await copyFile(
	'./node_modules/@dfinity/ledger-icrc/dist/candid/icrc_index-ng.idl.js',
	'./node_modules/@dfinity/ledger-icrc/dist/candid/icrc_index-ng.idl.mjs'
);
const { init: initIndex } = await import(
	'../node_modules/@dfinity/ledger-icrc/dist/candid/icrc_index-ng.idl.mjs'
);

const SNS = join(process.cwd(), 'src', 'frontend', 'src', 'env', 'tokens.sns.json');
const snses = JSON.parse((await readFile(SNS)).toString(), jsonReviver);

const createCanister = async ({ identity, agent, canisterId: canisterIdParam }) => {
	const { provisionalCreateCanisterWithCycles } = ICManagementCanister.create({
		agent
	});

	return await provisionalCreateCanisterWithCycles({
		settings: {
			controllers: [identity.getPrincipal().toString()]
		},
		canisterId: Principal.from(canisterIdParam)
	});
};

const installCode = async ({ agent, wasmPath, canisterId, arg }) => {
	const { installCode } = ICManagementCanister.create({
		agent
	});

	await installCode({
		mode: InstallMode.Install,
		canisterId: Principal.from(canisterId),
		wasmModule: await readFile(wasmPath),
		arg: new Uint8Array(arg)
	});
};

const installLedger = async ({
	agent,
	identity,
	ledgerCanisterId,
	metadata: { name, symbol, fee, decimals }
}) => {
	const ledgerPrincipal = identity.getPrincipal();

	// TODO
	const minterPrincipal = Principal.fromText(
		'xczur-53nx2-gceg4-xmgjs-es6km-zmjvy-ypbxe-4vfc7-4sbro-ymlax-oqe'
	);

	const initArgs = {
		token_symbol: symbol,
		token_name: name,
		decimals: [decimals],
		transfer_fee: Number(fee),
		minting_account: { owner: minterPrincipal, subaccount: [] },
		metadata: [],
		feature_flags: [{ icrc2: true }],
		initial_balances: [[{ owner: ledgerPrincipal, subaccount: [] }, Number(100_000_000_000n)]],
		maximum_number_of_accounts: [],
		accounts_overflow_trim_quantity: [],
		fee_collector_account: [],
		archive_options: {
			num_blocks_to_archive: 1000,
			trigger_threshold: 2000,
			more_controller_ids: [],
			max_message_size_bytes: [],
			max_transactions_per_response: [],
			cycles_for_archive_creation: [10000000000000],
			node_max_memory_size_bytes: [],
			controller_id: ledgerPrincipal
		},
		max_memo_length: []
	};

	const arg = IDL.encode(initLedger({ IDL }), [{ Init: initArgs }]);

	const wasmPath = join(process.cwd(), 'target', 'ic', 'ckbtc_ledger.wasm.gz');

	await installCode({
		agent,
		wasmPath,
		canisterId: ledgerCanisterId,
		arg
	});
};

const installIndex = async ({ agent, ledgerCanisterId, indexCanisterId }) => {
	const initArgs = {
		ledger_id: Principal.fromText(ledgerCanisterId)
	};

	const arg = IDL.encode(initIndex({ IDL }), [[{ Init: initArgs }]]);

	const wasmPath = join(process.cwd(), 'target', 'ic', 'ckbtc_index.wasm.gz');

	await installCode({
		agent,
		wasmPath,
		canisterId: indexCanisterId,
		arg
	});
};

const loadIdentitiy = async (pemFile) => {
	const rawKey = (await readFile(pemFile)).toString();

	const buf = pemfile.decode(rawKey);

	if (rawKey.includes('EC PRIVATE KEY')) {
		if (buf.length !== 118) {
			throw 'expecting byte length 118 but got ' + buf.length;
		}
		return Secp256k1KeyIdentity.fromSecretKey(buf.subarray(7, 39));
	}

	if (buf.length !== 85) {
		throw 'expecting byte length 85 but got ' + buf.length;
	}
	return Ed25519KeyIdentity.fromSecretKey(buf.subarray(16, 48));
};

const identity = await loadIdentitiy(
	`/Users/daviddalbusco/.config/dfx/identity/default/identity.pem`
);

const localAgent = async () => {
	const agent = new HttpAgent({ identity, fetch, host: 'http://127.0.0.1:4943/' });
	await agent.fetchRootKey();

	return agent;
};

const agent = await localAgent();

const deployLedger = async ({ ledgerCanisterId, metadata }) => {
	await createCanister({ identity, canisterId: ledgerCanisterId, agent });

	console.log(`Ledger canister ${ledgerCanisterId} created.`);

	await installLedger({ agent, identity, ledgerCanisterId, metadata });

	console.log(`Ledger canister ${ledgerCanisterId} installed.`);
};

const deployIndex = async ({ ledgerCanisterId, indexCanisterId }) => {
	await createCanister({ identity, canisterId: indexCanisterId, agent });

	console.log(`Index canister ${indexCanisterId} created.`);

	await installIndex({ agent, indexCanisterId, ledgerCanisterId });

	console.log(`Index canister ${indexCanisterId} installed.`);
};

const deploySns = async (sns) => {
	await deployLedger(sns);
	await deployIndex(sns);
};

for (const sns of snses) {
	await deploySns(sns);

	// Dfx/the local replica does not like being stressed with too many installation in parallel
	await new Promise((r) => setTimeout(r, 2000));
}
