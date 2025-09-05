#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, renameSync } from 'node:fs';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const deleteIndexes = async ({ dest = `./src/declarations` }) => {
	const rmIndex = async (dir) => {
		const indexPath = join(dest, dir, 'index.js');

		if (!existsSync(indexPath)) {
			return;
		}

		await rm(indexPath, { force: true });
	};

	const promises = readdirSync(dest).map(rmIndex);

	await Promise.all(promises);
};

/**
 * We have to manipulate the factory otherwise the editor prompt for following TypeScript error:
 *
 * TS7031: Binding element 'IDL' implicitly has an 'any' type.
 *
 */
const cleanFactory = async ({ dest = `./src/declarations` }) => {
	const promises = readdirSync(dest).map(
		(dir) =>
			new Promise((resolve) => {
				const cleanFile = async () => {
					const factoryPath = join(dest, dir, `${dir}.did.js`);

					if (!existsSync(factoryPath)) {
						resolve();
						return;
					}

					const content = await readFile(factoryPath, 'utf8');
					const cleanFactory = content.replace(
						/export const idlFactory = \({ IDL }\) => {/g,
						`// @ts-ignore
export const idlFactory = ({ IDL }) => {`
					);
					const cleanInit = cleanFactory.replace(
						/export const init = \({ IDL }\) => {/g,
						`// @ts-ignore
export const init = ({ IDL }) => {`
					);

					// To avoid race conditions, we first create a temporary file with the new content.
					// Then we rename it to the original file name.
					const tempPath = `${factoryPath}.${randomUUID()}.tmp`;
					await writeFile(tempPath, cleanInit, 'utf8');
					renameSync(tempPath, factoryPath);

					resolve();
				};

				cleanFile();
			})
	);

	await Promise.all(promises);
};

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

(async () => {
	try {
		await deleteIndexes({});

		await cleanFactory({});

		await renameFactory({});

		await copyCertifiedFactory({});

		console.log(`Types declarations updated!`);
	} catch (err) {
		console.error(`Error while updating the types declarations.`, err);
	}
})();
