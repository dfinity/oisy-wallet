#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PATH_FROM_ROOT = join(process.cwd(), 'src', 'frontend', 'src');
const PATH_TO_EN_JSON = join(PATH_FROM_ROOT, 'lib', 'i18n', 'en.json');
const PATH_TO_CODEBASE = join(PATH_FROM_ROOT);

const extractKeys = (obj, prefix = '') =>
	Object.keys(obj).reduce((res, el) => {
		if (typeof obj[el] === 'object') {
			return [...res, ...extractKeys(obj[el], `${prefix}${el}.`)];
		}
		return [...res, `${prefix}${el}`];
	}, []);

const getAllFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((file) => {
		const res = resolve(dir, file.name);
		return file.isDirectory()
			? getAllFiles(res)
			: file.isFile() && (res.endsWith('.svelte') || res.endsWith('.ts'))
				? [res]
				: [];
	});

// It checks if the key is used in the content or if the key is used in a dynamic way
const checkKeyUsage = ({ key, files }) =>
	files.some((file) => {
		const content = readFileSync(file, 'utf8');
		return (
			content.includes(key) ||
			(content.includes(`get(i18n)`) && key.split('.').every((k) => content.includes(k)))
		);
	});

const main = async () => {
	const en = JSON.parse(readFileSync(PATH_TO_EN_JSON, 'utf8'));
	const enKeys = extractKeys(en);

	const files = getAllFiles(PATH_TO_CODEBASE);
	const unusedKeys = enKeys.filter((key) => !checkKeyUsage({ key, files }));

	if (unusedKeys.length) {
		console.error('Unused keys:', unusedKeys);
		process.exit(1);
	} else {
		console.log('All keys are used.');
	}
};

main().catch(console.error);
