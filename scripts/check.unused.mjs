#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m'; // No Colour

const DATA_DIR = 'src/frontend/src';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const findSvelteFiles = (dir) => {
	let svelteFiles = [];
	const files = readdirSync(dir, { withFileTypes: true });

	for (const file of files) {
		const res = resolve(dir, file.name);
		if (file.isDirectory()) {
			svelteFiles = svelteFiles.concat(findSvelteFiles(res));
		} else if (file.isFile() && res.endsWith('.svelte')) {
			svelteFiles.push(res);
		}
	}
	return svelteFiles;
};

const searchForFileName = ({ filename, dir }) => {
	const files = readdirSync(dir, { withFileTypes: true });

	for (const file of files) {
		const res = resolve(dir, file.name);
		if (file.isDirectory()) {
			const foundInSubdir = searchForFileName({ filename, dir: res });
			if (foundInSubdir) return true;
		} else if (file.isFile()) {
			const content = readFileSync(res, 'utf-8');
			if (content.includes(filename)) {
				return true;
			}
		}
	}
	return false;
};

const main = async () => {
	console.log(`${NC}Scanning src folder to find all .svelte files`);
	console.log(`  ${GREEN}.${NC} means the .svelte is imported in another file`);
	console.log(`  ${RED}x${NC} means the .svelte is not imported and should likely be removed`);

	const svelteFiles = findSvelteFiles(DATA_DIR_PATH);
	const unusedFiles = [];

	for (const svelteFile of svelteFiles) {
		const filename = basename(svelteFile);

		if (filename.startsWith('+')) {
			process.stdout.write(`${GREEN}.${NC}`);
			continue;
		}

		const found = searchForFileName({ filename, dir: DATA_DIR });

		if (!found) {
			process.stdout.write(`${RED}x${NC}`);
			unusedFiles.push(svelteFile);
		} else {
			process.stdout.write(`${GREEN}.${NC}`);
		}
	}

	console.log('\n');

	if (unusedFiles.length === 0) {
		console.log(`${GREEN}No unused components found.${NC}`);
		process.exit(0);
	}

	for (const file of unusedFiles) {
		console.log(`${RED}Unused Svelte file: ${file}${NC}`);
	}
};

main().catch(console.error);
