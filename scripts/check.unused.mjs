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
	console.log(`${NC}Scanning ${DATA_DIR} folder to find all .svelte files`);

	const allSvelteFiles = findSvelteFiles(DATA_DIR_PATH);

	const potentialUnusedFiles = allSvelteFiles.filter((file) => !dirname(file).includes('routes'));

	const unusedFiles = allSvelteFiles.reduce((acc, file) => {
		const content = readFileSync(file, 'utf-8');
		return acc.filter((f) => !content.includes(basename(f)));
	}, potentialUnusedFiles);

	console.log('\n');

	if (unusedFiles.length === 0) {
		console.log(`${GREEN}No unused components found.${NC}`);
		process.exit(1);
	} else {
		console.log(`${RED}Found ${unusedFiles.length} unused component(s).${NC}`);
		unusedFiles.forEach((file) => console.log(`${RED}Unused Svelte file: ${file}${NC}`));
	}
};

main().catch(console.error);
