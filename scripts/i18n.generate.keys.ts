#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const PATH_FROM_ROOT = join(process.cwd(), 'src', 'frontend', 'src');
const PATH_TO_JSON_FILES = join(PATH_FROM_ROOT, 'lib', 'i18n');
const EN_JSON_FILE = 'en.json';
const PATH_TO_EN_JSON = join(PATH_TO_JSON_FILES, EN_JSON_FILE);

type Json = string | { [key: string]: Json };

const loadJson = (path: string): Json => JSON.parse(readFileSync(path, 'utf-8'));

const saveJson = ({ path, data }: { path: string; data: Json }) =>
	writeFileSync(path, JSON.stringify(data, null, 2));

const syncStructure = ({
	reference,
	target
}: {
	reference: Json;
	target: Json | undefined;
}): Json => {
	if (typeof reference === 'string') {
		return typeof target === 'string' ? target : '';
	}

	const result: Record<string, Json> = {};

	for (const key of Object.keys(reference)) {
		const refVal = reference[key];
		const tgtVal = typeof target === 'object' && target && key in target ? target[key] : undefined;
		result[key] = syncStructure({ reference: refVal, target: tgtVal });
	}

	return result;
};

const main = () => {
	const dir = PATH_TO_JSON_FILES;
	const files = readdirSync(dir).filter((f) => extname(f) === '.json');
	const referencePath = PATH_TO_EN_JSON;

	if (!existsSync(referencePath) || !files.includes(EN_JSON_FILE)) {
		console.error(`Missing reference file: ${EN_JSON_FILE}`);
		process.exit(1);
	}

	const reference = loadJson(referencePath);

	for (const file of files.filter((f) => f !== EN_JSON_FILE)) {
		const filePath = join(dir, file);
		const target = loadJson(filePath);
		const synced = syncStructure({ reference, target });

		saveJson({ path: filePath, data: synced });

		console.log(`✅ Synced: ${file}`);
	}
};

main();
