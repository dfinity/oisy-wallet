#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { findFiles } from './utils.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m'; // No Colour

const DATA_DIR = 'src/frontend/src';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const findSvelteFiles = (dir) =>
	findFiles({ dir, extensions: ['.svelte'], ignoreDirs: ['routes'] });

const searchForFileName = ({ filename, dir }) =>
	readdirSync(dir, { withFileTypes: true }).some((file) => {
		const res = resolve(dir, file.name);
		return file.isDirectory()
			? searchForFileName({ filename, dir: res })
			: file.isFile() && readFileSync(res, 'utf-8').includes(filename);
	});

const checkFileUsage = ({ filename, dir }) => searchForFileName({ filename, dir });

const logResult = (isUsed) => process.stdout.write(isUsed ? `${GREEN}.${NC}` : `${RED}x${NC}`);

const main = async () => {
	console.log(`${NC}Scanning ${DATA_DIR} folder to find all .svelte files`);
	console.log(`  ${GREEN}.${NC} means the .svelte is imported in another file`);
	console.log(`  ${RED}x${NC} means the .svelte is not imported and should likely be removed`);

	const svelteFiles = findSvelteFiles(DATA_DIR_PATH);
	const unusedFiles = svelteFiles.filter((file) => {
		const filename = basename(file);
		const isUsed = checkFileUsage({ filename, dir: DATA_DIR });
		logResult(isUsed);
		return !isUsed;
	});

	console.log('\n');

	if (unusedFiles.length === 0) {
		console.log(`${GREEN}No unused components found.${NC}`);
		process.exit(1);
	} else {
		unusedFiles.forEach((file) => console.log(`${RED}Unused Svelte file: ${file}${NC}`));
	}
};

main().catch(console.error);
