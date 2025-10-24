#!/usr/bin/env node

import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@icp-sdk/core/principal';
import { loadLocalIdentity, localAgent, SNSES } from './utils.mjs';

const PEM_FILE = '/Users/daviddalbusco/.config/dfx/identity/default/identity.pem';

const { ledgerCanisterId } = SNSES.find(({ metadata: { symbol } }) => symbol === 'CHAT');

const PRINCIPAL = 'es5tr-ln5ki-3q6nt-oi65r-yvlen-nu7ui-d2lk2-oygsh-qfqta-7m4rj-fae';

const transfer = async () => {
	const identity = await loadLocalIdentity(PEM_FILE);

	const agent = await localAgent({ identity });

	const ledger = IcrcLedgerCanister.create({
		agent,
		canisterId: ledgerCanisterId
	});

	return ledger.transfer({
		amount: 5_500_010_000n,
		to: { owner: Principal.fromText(PRINCIPAL), subaccount: [] }
	});
};

await transfer();
