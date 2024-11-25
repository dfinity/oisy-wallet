#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PATH_FROM_ROOT = join(process.cwd(), 'src', 'frontend', 'src');
const PATH_TO_EN_JSON = join(PATH_FROM_ROOT, 'lib', 'i18n', 'en.json');
const PATH_TO_OUTPUT = join(PATH_FROM_ROOT, 'lib', 'types', 'i18n.d.ts');

/**
 * Generates TypeScript interfaces from the English translation file.
 */
const generateTypes = async () => {
	const { default: en } = await import(PATH_TO_EN_JSON, { with: { type: 'json' } });

	const mapValues = (values) =>
		Object.entries(values).reduce(
			(acc, [key, value]) => [
				...acc,
				`${key}: ${typeof value === 'object' ? `{${mapValues(value).join('')}}` : 'string'};`
			],
			[]
		);

	const data = Object.entries(en).map(([key, values]) => ({
		key,
		name: `I18n${key.charAt(0).toUpperCase()}${key.slice(1)}`,
		values: mapValues(values)
	}));

	const lang = `lang: Languages;`;

	const main = `\n\ninterface I18n {${lang}${data.map(({ key, name }) => `${key}: ${name};`).join('')}}`;
	const interfaces = data
		.map(({ name, values }) => `\n\ninterface ${name} {${values.join('')}}`)
		.join('');

	const comment = `/**\n* Auto-generated definitions file ("npm run i18n")\n*/`;

	writeFileSync(PATH_TO_OUTPUT, `${comment}${interfaces}${main}`);
};

await generateTypes();
