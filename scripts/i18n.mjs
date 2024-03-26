#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PATH_FROM_ROOT = join(process.cwd(), 'src', 'frontend', 'src');
const PATH_TO_EN_JSON = join(PATH_FROM_ROOT, 'lib', 'i18n', 'en.json');
const PATH_TO_OUTPUT = join(PATH_FROM_ROOT, 'lib', 'types', 'i18n.d.ts');

/**
 * Generates TypeScript interfaces from the English translation file.
 *
 * Note: Supports only a one-child depth in the data structure.
 */
const generateTypes = async () => {
	const en = await import(PATH_TO_EN_JSON, { assert: { type: 'json' } });

	const data = Object.keys(en.default).map((key) => {
		const properties = Object.keys(en.default[key]).map((prop) => `${prop}: string;`);

		return {
			key,
			name: `I18n${key.charAt(0).toUpperCase()}${key.slice(1)}`,
			properties
		};
	});

	const lang = `lang: Languages;`;

	const main = `\n\ninterface I18n {${lang}${data.map((i) => `${i.key}: ${i.name};`).join('')}}`;
	const interfaces = data.map((i) => `\n\ninterface ${i.name} {${i.properties.join('')}}`).join('');

	const comment = `/**\n* Auto-generated definitions file ("npm run i18n")\n*/`;

	writeFileSync(PATH_TO_OUTPUT, `${comment}${interfaces}${main}`);
};

await generateTypes();
