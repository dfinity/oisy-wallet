#!/usr/bin/env node

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ENV, findHtmlFiles } from './build.utils.mjs';
import { findFiles } from './utils.mjs';

config({ path: `.env.${ENV}` });

const PLACEHOLDER = '<!-- ROUTE_STYLE -->';

const src = join(process.cwd(), 'src', 'frontend', 'src', 'routes');
const build = join(process.cwd(), 'build');

const parseStyle = (srcFile) => {
	const parsedSrcFile = srcFile.replace(/\/\([^)]+\)\//, '/'); // Remove e.g. /(sign)/ from path
	const srcDir = dirname(parsedSrcFile);

	const destDir = srcDir.replace(src, build);
	const destFile = join(destDir, 'index.html');

	const style = readFileSync(srcFile, 'utf8');

	// Just in case there is an empty CSS source file. Placeholder is cleaned with another hook.
	if (style.trim().length === 0) {
		return;
	}

	const content = readFileSync(destFile, 'utf8');
	const updatedContent = content.replace(PLACEHOLDER, `<style>\n${style}\n</style>`);

	writeFileSync(destFile, updatedContent);
};

const cleanPlaceholder = (targetFile) => {
	const content = readFileSync(targetFile, 'utf8');
	const updatedContent = content.replace(PLACEHOLDER, '');

	writeFileSync(targetFile, updatedContent);
};

const styleFiles = findFiles({ dir: src, extensions: ['.page.css'] });
styleFiles.forEach(parseStyle);

const htmlFiles = findHtmlFiles();
htmlFiles.forEach(cleanPlaceholder);
