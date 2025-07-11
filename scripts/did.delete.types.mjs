import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const { canisters } = JSON.parse(
	(await readFile(join(process.cwd(), 'dfx.json'))).toString('utf8')
);

const deleteFolder = async (canister) => {
	const path = join(process.cwd(), 'src', 'declarations', canister);
	await rm(path, { recursive: true, force: true });
};

const promises = Object.keys(canisters)
	.filter(
		(canister) =>
			![
				'backend',
				'frontend',
				'signer',
				'rewards',
				'kong_backend',
				'icp_swap_pool',
				'icp_swap_factory',
				'xtc_ledger',
				'sol_rpc',
				'llm'
			].includes(canister)
	)
	.map(deleteFolder);

await Promise.allSettled(promises);

console.log(`Useless declarations deleted!`);
