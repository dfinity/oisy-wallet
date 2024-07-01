#!/usr/bin/env node

import { deployIndex, deployLedger } from './deploy.utils.mjs';
import { SNSES } from './utils.mjs';

// We just install a subset for local development because dfx/local replica ultimately fails if too many canisters are installed in a row.
// See: https://forum.dfinity.org/t/too-many-open-files-os-error-24-state-manager-src-lib-rs33/18217/12?u=peterparker
const SELECTED_SNSES = SNSES.filter(({ metadata: { symbol } }) =>
	['DKP', 'CHAT', 'KINIC'].includes(symbol)
);

/**
 * Deploy Snses
 */

const deploySns = async (sns) => {
	await deployLedger(sns);
	await deployIndex(sns);
};

await Promise.all(SELECTED_SNSES.map(deploySns));
