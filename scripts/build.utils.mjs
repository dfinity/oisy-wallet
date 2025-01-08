import { join } from 'node:path';
import { findFiles } from './utils.mjs';

export const findHtmlFiles = (dir = join(process.cwd(), 'build')) =>
	findFiles({ dir, extensions: ['.html'] });

export const ENV =
	process.env.ENV === 'ic'
		? 'production'
		: (process.env.ENV ?? '').startsWith('test_fe_')
			? 'staging'
			: ['staging', 'beta'].includes(process.env.ENV)
				? process.env.ENV
				: 'development';

export const replaceEnv = ({ content, pattern, value }) => {
	const regex = new RegExp(pattern, 'g');
	return content.replace(regex, value);
};
