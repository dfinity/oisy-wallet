import { join } from 'node:path';
import { findFiles } from './utils.mjs';

export const findHtmlFiles = (dir = join(process.cwd(), 'build')) =>
	findFiles({ dir, extensions: ['.html'] });

const REQUESTED_ENV = process.env.ENV ?? process.env.DFX_NETWORK ?? '';

export const ENV =
	REQUESTED_ENV === 'ic'
		? 'production'
		: (REQUESTED_ENV ?? '').startsWith('test_fe_')
			? 'staging'
			: ['staging', 'beta'].includes(REQUESTED_ENV)
				? REQUESTED_ENV
				: 'development';

export const replaceEnv = ({ content, pattern, value }) => {
	const regex = new RegExp(pattern, 'g');
	return content.replace(regex, value);
};
