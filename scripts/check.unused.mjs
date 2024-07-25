#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { findFiles } from './utils.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m'; // No Colour

const DATA_DIR = 'src/frontend/src';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const findSvelteFiles = (dir) => findFiles({ dir, extensions: ['.svelte'] });

const main = async () => {
	console.log(`${NC}Scanning ${DATA_DIR} folder to find all .svelte files\n`);

	const allSvelteFiles = findSvelteFiles(DATA_DIR_PATH);

	let potentialUnusedFiles = allSvelteFiles.filter((file) => !dirname(file).includes('routes'));

	allSvelteFiles.forEach((file) => {
		const content = readFileSync(file, 'utf-8');
		potentialUnusedFiles = potentialUnusedFiles.filter(
			(potentialUnusedFile) => !content.includes(basename(potentialUnusedFile))
		);

		if (potentialUnusedFiles.length === 0) {
			console.log(`${GREEN}No unused components found.${NC}`);
			process.exit(0);
		}
	});

	if (potentialUnusedFiles.length === 0) {
		console.log(`${GREEN}No unused components found.${NC}`);
		process.exit(0);
	} else {
		console.log(`${RED}Found ${potentialUnusedFiles.length} unused component(s).${NC}`);
		potentialUnusedFiles.forEach((file) => console.log(`${RED}Unused Svelte file: ${file}${NC}`));
		process.exit(1);
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
