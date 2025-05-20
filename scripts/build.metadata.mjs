#!/usr/bin/env node

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ENV, OISY_IC_DOMAIN, findHtmlFiles, replaceEnv } from './build.utils.mjs';

config({ path: `.env.${ENV}` });

const METADATA_PATH = join(process.cwd(), 'src', 'frontend', 'src', 'env', 'oisy.metadata.json');

const getMetadata = () => JSON.parse(readFileSync(resolve(METADATA_PATH), 'utf-8'));

const parseMetadata = (targetFile) => {
	let content = readFileSync(targetFile, 'utf8');

	const METADATA = {
		...getMetadata(),
		OISY_IC_DOMAIN
	};

	Object.entries(METADATA).forEach(
		([key, value]) => (content = replaceEnv({ content, pattern: `{{${key}}}`, value }))
	);

	// Special use case. We need to build the dapp with a real URL within app.html other build fails.
	content = replaceEnv({
		content,
		pattern: `https://oisy.com`,
		value: OISY_IC_DOMAIN
	});

	writeFileSync(targetFile, content);
};

const parseUrl = (filePath) => {
	let content = readFileSync(filePath, 'utf8');

	content = replaceEnv({
		content,
		pattern: `https://oisy.com`,
		value: OISY_IC_DOMAIN
	});

	writeFileSync(filePath, content);
};

const updateRobotsTxt = () => {
	if (ENV !== 'production') {
		return;
	}

	const content = `User-agent: *
Allow: /
Sitemap: ${OISY_IC_DOMAIN}/sitemap.xml
Host: ${OISY_IC_DOMAIN}`;

	writeFileSync(join(process.cwd(), 'build', 'robots.txt'), content);
};

const removeMetaRobots = (targetFile) => {
	if (ENV !== 'production') {
		return;
	}

	const content = readFileSync(targetFile, 'utf8');

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
