import { IDL } from '@dfinity/candid';
import { ICManagementCanister, InstallMode } from '@dfinity/ic-management';
import { Principal } from '@dfinity/principal';
import { nonNullish } from '@dfinity/utils';
import { copyFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLocalIdentity, localAgent } from './utils.mjs';

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

/**
 * Init arguments and other properties
 */

const nextArg = ({ args, option }) => {
	const index = (args ?? []).findIndex((arg) => arg === option);

	if (index === -1) {
		throw new Error(`Arg ${option} not provided.`);
	}

	return args?.[index + 1];
};

const args = process.argv;

const PEM_FILE = nextArg({ args, option: '--pemFile' });
const MINTER_ID = nextArg({ args, option: '--minterId' });

const LEDGER_WASM_PATH = join(process.cwd(), 'target', 'ic', 'ckbtc_ledger.wasm.gz');
const INDEX_WASM_PATH = join(process.cwd(), 'target', 'ic', 'ckbtc_index.wasm.gz');

/**
 * Create and install canisters
 */

const createCanister = async ({ identity, agent, canisterId: canisterIdParam }) => {
	const { provisionalCreateCanisterWithCycles } = ICManagementCanister.create({
		agent
	});

	return await provisionalCreateCanisterWithCycles({
		settings: {
			controllers: [identity.getPrincipal().toString()]
		},
		...(nonNullish(canisterIdParam) && { canisterId: Principal.from(canisterIdParam) })
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

	const minterPrincipal = Principal.fromText(MINTER_ID);

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

	await installCode({
		agent,
		wasmPath: LEDGER_WASM_PATH,
		canisterId: ledgerCanisterId,
		arg
	});
};

const installIndex = async ({ agent, ledgerCanisterId, indexCanisterId }) => {
	const initArgs = {
		ledger_id:
			ledgerCanisterId instanceof Principal
				? ledgerCanisterId
				: Principal.fromText(ledgerCanisterId),
		retrieve_blocks_from_ledger_interval_seconds: []
	};

	const arg = IDL.encode(initIndex({ IDL }), [[{ Init: initArgs }]]);

	await installCode({
		agent,
		wasmPath: INDEX_WASM_PATH,
		canisterId: indexCanisterId,
		arg
	});
};

const identity = await loadLocalIdentity(PEM_FILE);

const agent = await localAgent({ identity });

export const deployLedger = async ({ ledgerCanisterId: canisterId, metadata }) => {
	const ledgerCanisterId = await createCanister({ identity, canisterId, agent });

	console.log(`Ledger canister ${ledgerCanisterId.toText()} created.`);

	await installLedger({ agent, identity, ledgerCanisterId, metadata });

	console.log(`Ledger canister ${ledgerCanisterId.toText()} installed.`);

	return ledgerCanisterId;
};

export const deployIndex = async ({ ledgerCanisterId, indexCanisterId: canisterId }) => {
	const indexCanisterId = await createCanister({ identity, canisterId, agent });

	console.log(`Index canister ${indexCanisterId.toText()} created.`);

	await installIndex({ agent, indexCanisterId, ledgerCanisterId });

	console.log(`Index canister ${indexCanisterId.toText()} installed.`);

	return indexCanisterId;
};
