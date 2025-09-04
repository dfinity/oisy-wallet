import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { NVDAX_TOKEN } from '$env/tokens/tokens-spl/tokens.nvdax.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { randomWait } from '$lib/utils/time.utils';
import { fetchSignatures, loadSolLamportsBalance, loadTokenBalance } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { SolanaNetworks } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { jsonReplacer } from '@dfinity/utils';
import { signature, address as solAddress, type Signature } from '@solana/kit';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const addresses = [
	'7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
	'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f',
	'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
	'FLAevxSbe182oYzjNqDB53g11rbvhWMF1iUCoCHFfHV4'
];

const ataAddresses = [
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: '7xSNhASWK77oZtPyVQf1HFUXU1xxXjqkpkxVTULBmcMD',
		token: USDC_TOKEN
	},
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: 'CTZFRs7fNtgEastyD6XoBsc9ySDuZTtuRvaFbH86WRb',
		token: BONK_TOKEN
	},
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: '8E2dYm7NXBSb7qS3zRtxKDw7mjzPCqVKQCy2EDeujUC2',
		token: POPCAT_TOKEN
	},
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: '7t8FwZRQTRaqtaeGLGij4FBsH9t9Cf918inTz3BYpuA7',
		token: JUP_TOKEN
	},
	{
		address: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		ataAddress: 'EF7heUqwgeSQ153PAdH9fR3tXn8QzbnMCdbshdpraFnA',
		token: NVDAX_TOKEN
	}
];

const out = ({ parts }: { parts: string[] }): string => {
	const dir = join(
		process.cwd(),
		'src',
		'frontend',
		'src',
		'tests',
		'fixtures',
		...parts.slice(0, -1)
	);

	mkdirSync(dir, { recursive: true });

	return join(dir, parts[parts.length - 1] ?? 'unknown.json');
};

const wait = () => randomWait({ max: 1000 });

const recordSignatures = async ({
	addr,
	pageLimit = 10
}: {
	addr: SolAddress;
	pageLimit?: number;
}): Promise<void> => {
	const baseParts = ['solana', addr, 'signatures'];

	rmSync(out({ parts: baseParts }), { recursive: true, force: true });

	let before: Signature | undefined = undefined;

	for (let i = 0; i < 1000; i += 1) {
		const page = await fetchSignatures({
			wallet: solAddress(addr),
			network: SolanaNetworks.mainnet,
			before: before ? signature(before) : undefined,
			limit: pageLimit
		});

		const name = before === undefined ? 'before-none.json' : `before-${before}.json`;

		writeFileSync(out({ parts: [...baseParts, name] }), JSON.stringify(page, jsonReplacer), 'utf8');

		if (page.length === 0) {
			break;
		}

		before = signature(page[page.length - 1]?.signature.toString());

		await wait();
	}
};

const recordTransactions = async ({
	addr,
	pageLimit = 10
}: {
	addr: SolAddress;
	pageLimit?: number;
}): Promise<void> => {
	const baseParts = ['solana', addr, 'transactions'];

	rmSync(out({ parts: baseParts }), { recursive: true, force: true });

	let before: GetSolTransactionsParams['before'] = undefined;

	for (let i = 0; i < 1000; i += 1) {
		const page: ReadonlyArray<SolTransactionUi> = await getSolTransactions({
			identity: undefined,
			address: addr,
			network: SolanaNetworks.mainnet,
			before,
			limit: pageLimit
		});

		const name = before === undefined ? 'before-none.json' : `before-${before}.json`;

		writeFileSync(out({ parts: [...baseParts, name] }), JSON.stringify(page, jsonReplacer), 'utf8');

		if (page.length === 0) {
			break;
		}

		before = page[page.length - 1]?.signature;

		await wait();
	}
};

const recordLamportsBalance = async ({ addr }: { addr: SolAddress }): Promise<void> => {
	const baseParts = ['solana', addr, 'balances', 'lamports'];

	rmSync(out({ parts: baseParts }), { recursive: true, force: true });

	const lamports = await loadSolLamportsBalance({
		address: addr,
		network: SolanaNetworks.mainnet
	});

	writeFileSync(
		out({ parts: [...baseParts, 'current.json'] }),
		JSON.stringify({ lamports }, jsonReplacer),
		'utf8'
	);

	await wait();
};

const recordTokenTransactions = async ({
	addr,
	tokenAddress,
	tokenOwnerAddress,
	pageLimit = 10
}: {
	addr: SolAddress;
	tokenAddress: string;
	tokenOwnerAddress: string;
	pageLimit?: number;
}): Promise<void> => {
	const baseParts = ['solana', addr, 'tokens', tokenAddress, 'transactions'];

	rmSync(out({ parts: baseParts }), { recursive: true, force: true });

	let before: GetSolTransactionsParams['before'] = undefined;

	for (let i = 0; i < 1000; i += 1) {
		const page: ReadonlyArray<SolTransactionUi> = await getSolTransactions({
			identity: undefined,
			address: addr,
			network: SolanaNetworks.mainnet,
			tokenAddress,
			tokenOwnerAddress,
			before,
			limit: pageLimit
		});

		const name = before === undefined ? 'before-none.json' : `before-${before}.json`;

		writeFileSync(out({ parts: [...baseParts, name] }), JSON.stringify(page, jsonReplacer), 'utf8');

		if (page.length === 0) {
			break;
		}

		before = page[page.length - 1]?.signature;

		await wait();
	}
};

const recordSplBalance = async ({ ataAddress }: { ataAddress: string }): Promise<void> => {
	const baseParts = ['solana', ataAddress, 'balances', 'spl'];

	rmSync(out({ parts: baseParts }), { recursive: true, force: true });

	const balance =
		(await loadTokenBalance({
			ataAddress,
			network: SolanaNetworks.mainnet
		})) ?? ZERO;

	writeFileSync(
		out({ parts: [...baseParts, 'current.json'] }),
		JSON.stringify({ balance }, jsonReplacer),
		'utf8'
	);

	await wait();
};

const main = async () => {
	for (const addr of addresses) {
		console.log(`Recording fixtures for ${addr}`);
		await recordSignatures({ addr });
		await recordTransactions({ addr });
		await recordLamportsBalance({ addr });
	}

	for (const {
		address,
		ataAddress,
		token: { address: tokenAddress, owner: tokenOwnerAddress }
	} of ataAddresses) {
		console.log(`Recording fixtures for ${ataAddress}`);
		await recordTokenTransactions({ addr: address, tokenAddress, tokenOwnerAddress });
		await recordSplBalance({ ataAddress });
	}

	console.log('Done.');
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
