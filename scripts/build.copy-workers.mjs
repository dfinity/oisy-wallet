import { cp } from 'node:fs';
import { extname } from 'node:path';

await cp(
	'node_modules/@junobuild/analytics/dist/workers/',
	'./build/workers',
	{
		recursive: true,
		filter: (source, destination) => extname(source) !== '.map'
	},
	(err) => {
		if (err === null) {
			return;
		}

		console.error('Copy workers error:', err);
	}
);
