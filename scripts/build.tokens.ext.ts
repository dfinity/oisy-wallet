#!/usr/bin/env node

import type { EnvExtToken } from '$env/types/env-ext-token';
import { jsonReplacer } from '@dfinity/utils';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { EXT_COLLECTIONS_JSON_FILE } from './constants.mjs';

const ACCEPTED_STANDARDS = ['ext'];

// This URL was extracted analysing the network request of https://toniq.io/
const TONIQ_COLLECTION_LIST_URL =
	'https://us-central1-entrepot-api.cloudfunctions.net/api/collections';

// This URL was extracted analysing the network request of nftGeek (https://t5t44-naaaa-aaaah-qcutq-cai.raw.icp0.io/)
const NFT_GEEK_COLLECTION_LIST_URL = 'https://api.nftgeek.app/api/1/collections';

interface ToniqResponseData {
	id: string;
	priority: number;
	name: string;
	brief: string;
	description: string;
	blurb: string;
	keywords: string;
	web: string;
	telegram: string;
	discord: string;
	twitter: string;
	medium: string;
	dscvr: string;
	distrikt: string;
	banner: string;
	avatar: string;
	collection: string;
	route: string;
	commission: number;
	legacy: string;
	unit: string;
	nftv: boolean;
	mature: boolean;
	market: boolean;
	dev: boolean;
	external: boolean;
	filter: boolean;
	sale: boolean;
	earn: boolean;
	saletype: string;
	standard: string;
	detailpage: string;
	nftlicense: string;
	kyc: boolean;
	owner: string;
	royalty: string;
}

interface NftGeekResponseData {
	canisterId: string;
	name: string;
	alias: string;
	interface: string;
}

interface NftGeekCollectionsResponseData {
	collections: NftGeekResponseData[];
}

const queryToniqData = async (): Promise<ToniqResponseData[]> => {
	const response = await fetch(TONIQ_COLLECTION_LIST_URL);

	if (!response.ok) {
		throw new Error(`Error loading Toniq collection list: ${response.statusText}`);
	}

	return await response.json();
};

const parseToniqData = (data: ToniqResponseData[]): EnvExtToken[] =>
	data.reduce<EnvExtToken[]>((acc, { id: canisterId, name, standard }) => {
		if (!ACCEPTED_STANDARDS.includes(standard.toLowerCase())) {
			return acc;
		}

		return [
			...acc,
			{
				canisterId,
				metadata: {
					name
				}
			}
		];
	}, []);

const getToniqCollections = async (): Promise<EnvExtToken[]> => {
	const data = await queryToniqData();

	return parseToniqData(data);
};

const queryNftGeekData = async (): Promise<NftGeekCollectionsResponseData> => {
	const response = await fetch(NFT_GEEK_COLLECTION_LIST_URL);

	if (!response.ok) {
		throw new Error(`Error loading nftGeek collection list: ${response.statusText}`);
	}

	return await response.json();
};

const parseNftGeekData = (data: NftGeekCollectionsResponseData): EnvExtToken[] =>
	data.collections.reduce<EnvExtToken[]>((acc, { canisterId, name, interface: standard }) => {
		if (!ACCEPTED_STANDARDS.includes(standard.toLowerCase())) {
			return acc;
		}

		return [
			...acc,
			{
				canisterId,
				metadata: {
					name
				}
			}
		];
	}, []);

const getNftGeekCollections = async (): Promise<EnvExtToken[]> => {
	const data = await queryNftGeekData();

	return parseNftGeekData(data);
};

const readExistingCollections = (): EnvExtToken[] => {
	if (!existsSync(EXT_COLLECTIONS_JSON_FILE)) {
		return [];
	}

	const content = readFileSync(EXT_COLLECTIONS_JSON_FILE, 'utf8');

	return JSON.parse(content) as EnvExtToken[];
};

const getCollections = async (): Promise<EnvExtToken[]> => {
	const existingCollections = readExistingCollections();

	const toniqCollections = await getToniqCollections();
	const nftGeekCollections = await getNftGeekCollections();

	// We want to keep the existing collections in the file that are not in the fetched lists anymore.
	const collectionsMap = [
		...existingCollections,
		...nftGeekCollections,
		...toniqCollections
	].reduce<Record<string, EnvExtToken>>((acc, collection) => {
		acc[collection.canisterId] = collection;

		return acc;
	}, {});

	return Object.values(collectionsMap).sort((a, b) => a.canisterId.localeCompare(b.canisterId));
};



try {
const tokens = await getCollections();

	writeFileSync(EXT_COLLECTIONS_JSON_FILE, JSON.stringify(tokens, jsonReplacer, 8));
} catch (err) {
	console.error(err);
	process.exit(1);
}
