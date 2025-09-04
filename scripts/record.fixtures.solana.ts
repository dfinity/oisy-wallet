import type { SolAddress } from '$lib/types/address';
import { randomWait } from '$lib/utils/time.utils';
import { fetchSignatures } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { jsonReplacer } from '@dfinity/utils';
import { signature, address as solAddress } from '@solana/kit';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const addresses = [
	'7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
	'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f',
	'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
	'FLAevxSbe182oYzjNqDB53g11rbvhWMF1iUCoCHFfHV4'
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

	rmSync(dir, { recursive: true, force: true });

	mkdirSync(dir, { recursive: true });

	return join(dir, parts[parts.length - 1] ?? 'unknown.json');
};

const recordSignatures = async ({
	addr,
	pageLimit = 10
}: {
	addr: SolAddress;
	pageLimit?: number;
}): Promise<void> => {
	let before: string | undefined = undefined;

	for (let i = 0; i < 500; i += 1) {
		const page = await fetchSignatures({
			wallet: solAddress(addr),
			network: SolanaNetworks.mainnet,
			before: before ? signature(before) : undefined,
			limit: pageLimit
		});

		const name = before === undefined ? 'before-none.json' : `before-${before}.json`;

		writeFileSync(
			out({ parts: ['solana', addr, 'signatures', name] }),
			JSON.stringify(page, jsonReplacer, 2),
			'utf8'
		);

		if (page.length === 0) {
			break;
		}

		before = page[page.length - 1]?.signature.toString();

		await randomWait({ max: 1000 });
	}
};

const recordTransactions = async ({
	addr,
	pageLimit = 10
}: {
	addr: SolAddress;
	pageLimit?: number;
}): Promise<void> => {
	let before: string | undefined = undefined;

	for (let i = 0; i < 500; i += 1) {
		const page: ReadonlyArray<SolTransactionUi> = await getSolTransactions({
			identity: undefined,
			address: addr,
			network: SolanaNetworks.mainnet,
			before,
			limit: pageLimit
		});

		const name = before === undefined ? 'before-none.json' : `before-${before}.json`;

		writeFileSync(
			out({ parts: ['solana', addr, 'transactions', name] }),
			JSON.stringify(page, jsonReplacer, 2),
			'utf8'
		);

		if (page.length === 0) {
			break;
		}

		before = page[page.length - 1]?.signature;

		await randomWait({ max: 1000 });
	}
};

const main = async () => {
	for (const addr of addresses) {
		console.log(`Recording fixtures for ${addr}`);
		await recordSignatures({ addr });
		await recordTransactions({ addr });
	}

	console.log('Done.');
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
