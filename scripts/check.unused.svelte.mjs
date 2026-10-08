#!/usr/bin/env node

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { findFiles } from './utils.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m'; // No Colour

const DATA_DIR = 'src/frontend/src';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const TESTS_DIR_PATH = resolve(DATA_DIR_PATH, 'tests');

const REMOVE_FILES = process.argv.includes('--remove-files');

// TODO: Check if the svelte files in the tests are actually used, and used ONLY in the tests
const findSvelteFiles = (dir) => findFiles({ dir, extensions: ['.svelte'], ignoreDirs: ['tests'] });

const findSearchFiles = (dir) => findFiles({ dir, extensions: ['.svelte', '.ts'] });

// Tests mirror the component path under `tests/`, named either `Component.svelte.spec.ts` or, in
// older files, `Component.spec.ts`. The latter is claimed only when no sibling module could own it.
const findTestFiles = (file) => {
	const mirroredPath = resolve(TESTS_DIR_PATH, relative(DATA_DIR_PATH, file));
	const strippedPath = mirroredPath.replace(/\.svelte$/, '');

	return [
		`${mirroredPath}.spec.ts`,
		...(existsSync(file.replace(/\.svelte$/, '.ts')) ? [] : [`${strippedPath}.spec.ts`])
	].filter((testFile) => existsSync(testFile));
};

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
				console.log(`${RED}Relative import of '${fileBasename}' found in ${file}${NC}`);
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

			const testFiles = findTestFiles(file);
			testFiles.forEach((testFile) => console.log(`${RED}Test of unused file: ${testFile}${NC}`));

			if (REMOVE_FILES) {
				unlinkSync(file);
				console.log(`${GREEN}Removed: ${file}${NC}`);

				testFiles.forEach((testFile) => {
					unlinkSync(testFile);
					console.log(`${GREEN}Removed: ${testFile}${NC}`);
				});
			}
		});

		if (REMOVE_FILES) {
			console.log(
				'Run the script again to check for more unused files after removing the ones above.'
			);
			await main();
		}

		console.log();

		process.exit(1);
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
