#!/usr/bin/env node

import { nonNullish } from '@dfinity/utils';
import { deployIndex, deployLedger } from './deploy.utils.mjs';

const WORDS = [
	'Whimsical',
	'Elixir',
	'Cascade',
	'Enigma',
	'Nebula',
	'Quixotic',
	'Zephyr',
	'Labyrinth',
	'Serendipity',
	'Ephemeral',
	'Luminous',
	'Mirage',
	'Synthesis',
	'Obsidian',
	'Paradox',
	'Euphoria',
	'Solstice',
	'Eloquent',
	'Abyss',
	'Ethereal',
	'Vortex',
	'Epiphany',
	'Zenith',
	'Mosaic',
	'Resonate',
	'Lucid',
	'Chasm',
	'Enchant',
	'Astral',
	'Nexus'
];

const words = [...Array(3)].map(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
const name = words.join(' ');
const symbol = words.map((word) => word.slice(0, 1).toUpperCase()).join('');

const randomMemecoin = {
	ledgerCanisterId: undefined,
	indexCanisterId: undefined,
	metadata: {
		decimals: 8,
		name,
		symbol,
		fee: 100000n
	}
};

const ledgerCanisterId = await deployLedger(randomMemecoin);

const args = process.argv.slice(2);
const withIndex = (args ?? []).includes('--with-index');

const indexCanisterId = withIndex
	? await deployIndex({
			...randomMemecoin,
			ledgerCanisterId
		})
	: undefined;

console.log(
	`✅ Memecoin ${randomMemecoin.metadata.name} (${randomMemecoin.metadata.symbol}) deployed.`
);
console.log(`🏦 Ledger ${ledgerCanisterId.toText()}`);

if (nonNullish(indexCanisterId)) {
	console.log(`🔎 Index ${indexCanisterId.toText()}`);
}
