#!/usr/bin/env node

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENV, findHtmlFiles } from './build.utils.mjs';

config({ path: `.env.${ENV}` });

const replaceEnv = ({ html, pattern, value }) => {
	const regex = new RegExp(pattern, 'g');
	return html.replace(regex, value);
};

const parseMetadata = (targetFile) => {
	let content = readFileSync(targetFile, 'utf-8');

	const METADATA_KEYS = [
		'VITE_OISY_NAME',
		'VITE_OISY_ONELINER',
		'VITE_OISY_DESCRIPTION',
		'VITE_OISY_URL',
		'VITE_OISY_ICON'
	];

	METADATA_KEYS.forEach(
		(key) =>
			(content = replaceEnv({ html: content, pattern: `{{${key}}}`, value: process.env[key] }))
	);

	// Special use case. We need to build the dapp with a real URL within app.html other build fails.
	content = replaceEnv({
		html: content,
		pattern: `https:\/\/oisy\.com`,
		value: process.env.VITE_OISY_URL
	});

	writeFileSync(targetFile, content);
};

const parseUrl = (filePath) => {
	let content = readFileSync(filePath, 'utf-8');

	content = replaceEnv({
		html: content,
		pattern: `https:\/\/oisy\.com`,
		value: process.env.VITE_OISY_URL
	});

	writeFileSync(filePath, content);
};

const updateRobotsTxt = () => {
	if (ENV !== 'production') {
		return;
	}

	const content = `User-agent: *
Allow: /
Sitemap: ${process.env.VITE_OISY_URL}/sitemap.xml
Host: ${process.env.VITE_OISY_URL}`;

	writeFileSync(join(process.cwd(), 'build', 'robots.txt'), content);
};

const removeMetaRobots = (targetFile) => {
	if (ENV !== 'production') {
		return;
	}

	let content = readFileSync(targetFile, 'utf-8');

	const update = content.replace(/<meta\s+name="robots"\s+content="noindex"\s*\/>/, '');

	writeFileSync(targetFile, update);
};

const htmlFiles = findHtmlFiles();
htmlFiles.forEach((htmlFile) => parseMetadata(htmlFile));

parseUrl(join(process.cwd(), 'build', 'sitemap.xml'));
parseMetadata(join(process.cwd(), 'build', 'manifest.webmanifest'));

// SEO
htmlFiles.forEach((htmlFile) => removeMetaRobots(htmlFile));
updateRobotsTxt();
