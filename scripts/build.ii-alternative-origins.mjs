#!/usr/bin/env node

import { notEmptyString } from '@dfinity/utils';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENV } from './build.utils.mjs';

config({ path: `.env.${ENV}` });

const writeAlternativeOrigins = (alternativeOrigins) => {
	const iiAlternativeOriginsFile = join(
		process.cwd(),
		'build',
		'.well-known',
		'ii-alternative-origins'
	);
	writeFileSync(iiAlternativeOriginsFile, JSON.stringify(alternativeOrigins));
};

const alternativeOrigins = (process.env['VITE_AUTH_ALTERNATIVE_ORIGINS'] ?? '')
	.split(',')
	.filter(notEmptyString);

if (alternativeOrigins.length === 0) {
	process.exit(0);
}

const assertAlternativeOrigin = (alternativeOrigin) => new URL(alternativeOrigin);
alternativeOrigins.forEach(assertAlternativeOrigin);

writeAlternativeOrigins({
	alternativeOrigins
});
