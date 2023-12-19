import { lstatSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const findFiles = ({ dir, files }) => {
	readdirSync(dir).forEach((file) => {
		const fullPath = join(dir, file);
		if (lstatSync(fullPath).isDirectory()) {
			findFiles({ dir: fullPath, files });
		} else {
			files.push(fullPath);
		}
	});
};

export const findHtmlFiles = (dir = join(process.cwd(), 'build')) => {
	const files = [];
	findFiles({ dir, files });

	return files.filter((entry) => ['.html'].includes(extname(entry)));
};

export const ENV =
	process.env.ENV === 'ic'
		? 'production'
		: process.env.ENV === 'staging'
			? 'staging'
			: 'development';
