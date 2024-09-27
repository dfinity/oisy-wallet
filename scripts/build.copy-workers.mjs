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
		// TODO: Remove ESLint exception and use nullish checks
		// eslint-disable-next-line local-rules/use-nullish-checks
		if (err === null) {
			return;
		}

		console.error('Copy workers error:', err);
	}
);
