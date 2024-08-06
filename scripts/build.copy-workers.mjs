import { isNullish } from '@dfinity/utils';
import { cp } from 'node:fs';
import { extname } from 'node:path';

await cp(
	'node_modules/@junobuild/analytics/dist/workers/',
	'./build/workers',
	{
		recursive: true,
		filter: (source) => extname(source) !== '.map'
	},
	(err) => {
		if (isNullish(err)) {
			return;
		}

		console.error('Copy workers error:', err);
	}
);
