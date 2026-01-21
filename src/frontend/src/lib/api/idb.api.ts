import { isNullish } from '@dfinity/utils';

// We prefer to run deletions async as promises to avoid that a single failure blocks the whole process.
const deleteDatabase = (name: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);

		request.addEventListener('success', () => resolve());
		request.addEventListener('error', () =>
			reject(request.error ?? new Error(`Failed to delete IndexedDB database: ${name}`))
		);
		request.addEventListener('blocked', () =>
			reject(new Error(`IndexedDB database deletion blocked: ${name}`))
		);
	});

export const deleteIdbAllOisyRelated = async () => {
	try {
		const dbInfo = await indexedDB.databases();

		const promises = dbInfo.map(async ({ name }) => {
			if (isNullish(name) || !name.startsWith('oisy-')) {
				return;
			}

			await deleteDatabase(name);
		});

		await Promise.allSettled(promises);
	} catch (_: unknown) {
		// Some browsers do not support indexedDB.databases().
		// In this case, we cannot clear all databases, but we don't necessarily need to.
	}
};
