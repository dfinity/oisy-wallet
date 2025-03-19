#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findFiles } from './utils.mjs';

const PATH_FROM_ROOT = join(process.cwd(), 'src', 'frontend', 'src');
const PATH_TO_EN_JSON = join(PATH_FROM_ROOT, 'lib', 'i18n', 'en.json');
const PATH_TO_CODEBASE = join(PATH_FROM_ROOT);

const extractKeys = ({ obj, prefix = '' }) =>
	Object.keys(obj).reduce((res, el) => {
		if (typeof obj[el] === 'object') {
			return [...res, ...extractKeys({ obj: obj[el], prefix: `${prefix}${el}.` })];
		}
		return [...res, `${prefix}${el}`];
	}, []);

// It checks if the key is used in the content or if the key is used in a dynamic way
const checkKeyUsage = ({ key, content }) =>
	content.includes(key) ??
	(content.includes(`get(i18n)`) && key.split('.').every((k) => content.includes(k)));

const main = () => {
	const en = JSON.parse(readFileSync(PATH_TO_EN_JSON, 'utf8'));

	let potentialUnusedKeys = extractKeys({ obj: en });

	const files = findFiles({ dir: PATH_TO_CODEBASE, extensions: ['.svelte', '.ts'] });

	files.forEach((file) => {
		const content = readFileSync(file, 'utf8');
		potentialUnusedKeys = potentialUnusedKeys.filter((key) => !checkKeyUsage({ key, content }));

		if (potentialUnusedKeys.length === 0) {
			console.log('All keys are used.');
			process.exit(0);
		}
	});

	if (potentialUnusedKeys.length === 0) {
		console.log('All keys are used.');
		process.exit(0);
	} else {
		console.error('Unused keys:', potentialUnusedKeys);
		process.exit(1);
	}
};

main();
