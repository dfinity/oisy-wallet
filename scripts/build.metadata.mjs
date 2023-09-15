#!/usr/bin/env node

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { findHtmlFiles } from './build.utils.mjs';

config({ path: `.env.${process.env.ENV ?? 'development'}` });

const buildMetadata = (htmlFile) => {
	let indexHtml = readFileSync(htmlFile, 'utf-8');

	const replaceEnv = ({ html, pattern, value }) => {
		const regex = new RegExp(pattern, 'g');
		return html.replace(regex, value);
	};

	const METADATA_KEYS = [
		'VITE_OISY_NAME',
		'VITE_OISY_DESCRIPTION',
		'VITE_OISY_URL',
		'VITE_OISY_ICON'
	];

	METADATA_KEYS.forEach(
		(key) =>
			(indexHtml = replaceEnv({ html: indexHtml, pattern: `{{${key}}}`, value: process.env[key] }))
	);

	// Special use case. We need to build the dapp with a real URL within app.html other build fails.
	indexHtml = replaceEnv({
		html: indexHtml,
		pattern: `https:\/\/oisy\.com`,
		value: process.env.VITE_OISY_URL
	});

	writeFileSync(htmlFile, indexHtml);
};

const htmlFiles = findHtmlFiles();
htmlFiles.forEach((htmlFile) => buildMetadata(htmlFile));
