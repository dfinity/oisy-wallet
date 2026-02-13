#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const renameFactory = async ({ dest = `./src/declarations` }) => {
	const promises = readdirSync(dest).map(
		(dir) =>
			new Promise((resolve) => {
				const renameFile = async () => {
					const factoryPath = join(dest, dir, `${dir}.did.js`);
					const formattedPath = join(dest, dir, `${dir}.factory.did.js`);

					if (!existsSync(factoryPath)) {
						resolve();
						return;
					}

					await rename(factoryPath, formattedPath);

					resolve();
				};

				renameFile();
			})
	);

	await Promise.all(promises);
};

const copyCertifiedFactory = async ({ dest = `./src/declarations` }) => {
	const promises = readdirSync(dest)
		.filter((dir) => !['frontend'].includes(dir))
		.map(
			(dir) =>
				new Promise((resolve) => {
					const copyFile = async () => {
						const uncertifiedFactoryPath = join(dest, dir, `${dir}.factory.did.js`);

						if (!existsSync(uncertifiedFactoryPath)) {
							resolve();
							return;
						}

						const content = await readFile(uncertifiedFactoryPath);

						const certifiedFactoryPath = join(dest, dir, `${dir}.factory.certified.did.js`);

						await writeFile(certifiedFactoryPath, content.toString().replace(/\['query'],?/g, ''));

						resolve();
					};

					copyFile();
				})
		);

	await Promise.all(promises);
};

try {
	await renameFactory({});

	await copyCertifiedFactory({});

	console.log('Factories and certified declarations generated!');
} catch (err) {
	console.error('Error while updating the types declarations.', err);
}
