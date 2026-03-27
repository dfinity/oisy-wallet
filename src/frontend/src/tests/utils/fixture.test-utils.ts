import { jsonReviver } from '@dfinity/utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const loadJsonFixture = <T>(...parts: string[]): T => {
	const filePath = join(process.cwd(), 'src', 'frontend', 'src', 'tests', 'fixtures', ...parts);
	return JSON.parse(readFileSync(filePath, 'utf8'), jsonReviver) as T;
};

export const sigSlug = (sig: string | undefined): string =>
	sig === undefined ? 'before-none' : `before-${sig}`;
