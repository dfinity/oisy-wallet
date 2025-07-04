#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findFiles } from './utils.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m'; // No Colour

const DATA_DIR = 'src/frontend/src';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const EXPORTED_CONST_REGEX = /^\s*export\s+const\s+(\w+)\b/gm;

const IGNORED_EXTENSIONS = ['.spec.ts', '.mock.ts', '.test-utils.ts'];

const checkIgnoredFile = (file) => IGNORED_EXTENSIONS.some((ext) => file.includes(ext));

const findSourceFiles = (dir) =>
	findFiles({ dir, extensions: ['.ts'] }).filter((file) => !checkIgnoredFile(file));

const findAllSearchableFiles = (dir) => findFiles({ dir, extensions: ['.ts', '.svelte'] });

const noUnusedExports = () => {
	console.log(`${GREEN}No unused exported constants found.${NC}`);
	process.exit(0);
};

const extractExportedConstNames = (filePath, content) => {
	const matches = [...content.matchAll(EXPORTED_CONST_REGEX)];
	return matches.map((m) => ({ name: m[1], file: filePath }));
};

const main = () => {
	console.log(`${NC}Scanning ${DATA_DIR} for unused \`export const\` declarations\n`);

	const sourceFiles = findSourceFiles(DATA_DIR_PATH);
	const searchFiles = findAllSearchableFiles(DATA_DIR_PATH);

	const exports = [];

	for (const file of sourceFiles) {
		const content = readFileSync(file, 'utf-8');
		exports.push(...extractExportedConstNames(file, content));
	}

	const unused = [];

	for (const exp of exports) {
		let used = false;

		for (const file of searchFiles) {
			if (file === exp.file) {
				continue;
			}

			const content = readFileSync(file, 'utf-8');
			if (content.includes(exp.name)) {
				used = true;
				break;
			}
		}

		if (!used) {
			unused.push(exp);
		}
	}

	if (unused.length === 0) {
		noUnusedExports();
	} else {
		console.log(`${RED}Found ${unused.length} unused exported constant(s).${NC}`);
		unused.forEach(({ name, file }) => {
			console.log(`${RED}Unused export: ${name} in ${file}${NC}`);
		});
		process.exit(1);
	}
};

try {
	main();
} catch (err) {
	console.error(err);
	process.exit(1);
}
