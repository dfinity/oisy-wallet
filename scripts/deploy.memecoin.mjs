#!/usr/bin/env node

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

await deployIndex({
	...randomMemecoin,
	ledgerCanisterId
});

console.log(
	`✅ Memecoin ${randomMemecoin.metadata.name} (${randomMemecoin.metadata.symbol}) deployed.`
);
