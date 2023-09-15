#!/usr/bin/env node

import { config } from 'dotenv';
import {readFileSync, writeFileSync} from 'node:fs';
import { findHtmlFiles } from './build.utils.mjs';

config({ path: `.env.${process.env.ENV ?? 'development'}` });

const buildMetadata = (htmlFile) => {
	let indexHtml = readFileSync(htmlFile, 'utf-8');

	const replaceEnv = ({ html, key }) => {
		const regex = new RegExp(`/{{${key}}/gm`);
		return html.replace(regex, process.env[key]);
	};

	const METADATA_KEYS = [
		'VITE_OISY_NAME',
		'VITE_OISY_DESCRIPTION',
		'VITE_OISY_URL',
		'VITE_OISY_ICON'
	];

	METADATA_KEYS.forEach((key) => (indexHtml = replaceEnv({ html: indexHtml, key })));

	writeFileSync(htmlFile, indexHtml);
};

const htmlFiles = findHtmlFiles();
htmlFiles.forEach((htmlFile) => buildMetadata(htmlFile));
