import { join } from 'node:path';
import { findFiles } from './utils.mjs';

export const findHtmlFiles = (dir = join(process.cwd(), 'build')) =>
	findFiles({ dir, extensions: ['.html'] });

export const ENV =
	process.env.ENV === 'ic'
		? 'production'
		: process.env.ENV === 'staging'
			? 'staging'
			: 'development';
