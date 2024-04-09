import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const AGGREGATOR_PAGE_SIZE = 10;
const SNS_AGGREGATOR_CANISTER_URL = 'https://3r4gx-wqaaa-aaaaq-aaaia-cai.icp0.io';
const AGGREGATOR_CANISTER_VERSION = 'v1';

const AGGREGATOR_URL = `${SNS_AGGREGATOR_CANISTER_URL}/${AGGREGATOR_CANISTER_VERSION}/sns`;

const DATA_FOLDER = join(process.cwd(), 'src', 'frontend', 'src', 'icp', 'data');
const STATIC_FOLDER = join(process.cwd(), 'src', 'frontend', 'static', 'logo', 'snses');

if (!existsSync(DATA_FOLDER)) {
	mkdirSync(DATA_FOLDER, { recursive: true });
}

if (!existsSync(STATIC_FOLDER)) {
	mkdirSync(STATIC_FOLDER, { recursive: true });
}

const aggregatorPageUrl = (page) => `list/page/${page}/slow.json`;

const querySnsAggregator = async (page = 0) => {
	const response = await fetch(`${AGGREGATOR_URL}/${aggregatorPageUrl(page)}`);

	if (!response.ok) {
		// If the error is after the first page, is because there are no more pages it fails
		if (page > 0) {
			return [];
		}

		throw new Error('Error loading SNS projects from aggregator canister');
	}

	const data = await response.json();

	if (data.length === AGGREGATOR_PAGE_SIZE) {
		const nextPageData = await querySnsAggregator(page + 1);
		return [...data, ...nextPageData];
	}

	return data;
};

export const findSnses = async () => {
	try {
		const data = await querySnsAggregator();

		// 3 === Committed
		const snses = data.filter(
			({
				swap_state: {
					swap: { lifecycle }
				}
			}) => lifecycle === 3
		);

		writeFileSync(join(DATA_FOLDER, 'snses.json'), JSON.stringify(snses));
	} catch (err) {
		throw new Error('Error querying Snses', err);
	}
};

await findSnses();
