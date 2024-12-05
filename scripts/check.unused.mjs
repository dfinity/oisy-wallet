#!/usr/bin/env node

import { readFileSync, unlinkSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { findFiles } from './utils.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m'; // No Colour

const DATA_DIR = 'src/frontend/src';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const REMOVE_FILES = process.argv.includes('--remove-files');

const findSvelteFiles = (dir) => findFiles({ dir, extensions: ['.svelte'] });

const findSearchFiles = (dir) => findFiles({ dir, extensions: ['.svelte', '.ts'] });

const noUnusedFiles = () => {
	console.log(`${GREEN}No unused components found.${NC}`);
	process.exit(0);
};

const main = async () => {
	console.log(`${NC}Scanning ${DATA_DIR} folder to find all .svelte files\n`);

	const allSvelteFiles = findSvelteFiles(DATA_DIR_PATH);
	const allSearchFiles = findSearchFiles(DATA_DIR_PATH).filter(
		(file) => !file.includes('.spec.ts')
	);

	let potentialUnusedFiles = allSvelteFiles.filter((file) => !dirname(file).includes('routes'));

	allSearchFiles.forEach((file) => {
		const content = readFileSync(file, 'utf-8');

		potentialUnusedFiles = potentialUnusedFiles.filter((potentialUnusedFile) => {
			const fileBasename = basename(potentialUnusedFile);

			if (content.includes(`./${fileBasename}`)) {
				console.log(`${RED}Relative import of '${fileBasename}' found in '${file}${NC}'`);
				return false;
			}

			return !content.includes(`${basename(dirname(potentialUnusedFile))}/${fileBasename}`);
		});

		if (potentialUnusedFiles.length === 0) {
			noUnusedFiles();
		}
	});

	if (potentialUnusedFiles.length === 0) {
		noUnusedFiles();
	} else {
		console.log(`${RED}Found ${potentialUnusedFiles.length} unused component(s).${NC}`);
		potentialUnusedFiles.forEach((file) => {
			console.log(`${RED}Unused Svelte file: ${file}${NC}`);
			if (REMOVE_FILES) {
				unlinkSync(file);
				console.log(`${GREEN}Removed: ${file}${NC}`);
			}
		});

		if (REMOVE_FILES) {
			console.log(
				'Run the script again to check for more unused files after removing the ones above.'
			);
			await main();
		}

		process.exit(1);
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
