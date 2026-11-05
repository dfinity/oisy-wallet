import type { AppDelegationSource, SessionMinterOptions } from '@icp-sdk/auth/client';
import { IC_REQUEST_AUTH_DELEGATION_DOMAIN_SEPARATOR, requestIdOf } from '@icp-sdk/core/agent';
import {
	Delegation,
	DelegationChain,
	DelegationIdentity,
	ECDSAKeyIdentity
} from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { prepareWebSession } from './session.js';

const ii = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');

async function fixture() {
	const receiver = await prepareWebSession();
	const root = await ECDSAKeyIdentity.generate();
	const native = await ECDSAKeyIdentity.generate();
	const account = await ECDSAKeyIdentity.generate();
	const deadline = Date.now() + 120_000;
	const parent = await DelegationChain.create(root, native.getPublicKey(), new Date(deadline), {
		targets: [ii]
	});
	const chain = await DelegationChain.create(
		native,
		{ toDer: () => receiver.publicKey },
		new Date(deadline),
		{
			previous: parent,
			targets: [ii]
		}
	);
	const grant = { chain, expectedAccount: account.getPrincipal(), expiresAtMs: deadline };
	const source: AppDelegationSource = {
		mint: (key) => DelegationChain.create(account, { toDer: () => key }, new Date(deadline))
	};
	return { receiver, root, native, account, grant, source };
}

function replaceLeaf(chain: DelegationChain, delegation: Delegation): DelegationChain {
	const leaf = chain.delegations.at(-1);
	assert.ok(leaf);
	return DelegationChain.fromDelegations(
		[...chain.delegations.slice(0, -1), { delegation, signature: leaf.signature }],
		chain.publicKey
	);
}

test('uses SDK session APIs and a non-exportable web key; holds the expected app account', async () => {
	const f = await fixture();
	try {
		const identity = await f.receiver.accept(f.grant, async (options) => {
			assert.equal(options.canisterId.compareTo(ii), 'eq');
			assert.equal(options.sessionChain, f.grant.chain);
			assert.ok(options.sessionKey instanceof ECDSAKeyIdentity);
			assert.equal(options.sessionKey.getKeyPair().privateKey.extractable, false);
			return f.source;
		});
		assert.ok(identity instanceof DelegationIdentity);
		assert.equal(identity.getPrincipal().compareTo(f.account.getPrincipal()), 'eq');
		assert.equal(identity.getDelegation().delegations.length, 1);
		assert.equal((await identity.sign(new Uint8Array([1, 2, 3]))).length, 64);
	} finally {
		f.receiver.close();
	}
});

test('refuses a grant for another web key before minting', async () => {
	const f = await fixture();
	const stranger = await ECDSAKeyIdentity.generate();
	const leaf = f.grant.chain.delegations.at(-1)!.delegation;
	const chain = replaceLeaf(
		f.grant.chain,
		new Delegation(stranger.getPublicKey().toDer(), leaf.expiration, [ii])
	);
	await assert.rejects(
		f.receiver.accept({ ...f.grant, chain }, async () => {
			assert.fail('invalid grant reached minting');
		}),
		/Invalid bounded/
	);
});

for (const kind of ['no-scope', 'other-scope', 'extra-scope', 'queries'] as const) {
	test(`refuses ${kind} at the receiving hop`, async () => {
		const f = await fixture();
		const leaf = f.grant.chain.delegations.at(-1)!.delegation;
		const other = Principal.fromText('aaaaa-aa');
		const targets =
			kind === 'no-scope'
				? undefined
				: kind === 'other-scope'
					? [other]
					: kind === 'extra-scope'
						? [ii, other]
						: [ii];
		const chain = replaceLeaf(
			f.grant.chain,
			new Delegation(
				leaf.pubkey,
				leaf.expiration,
				targets,
				kind === 'queries' ? 'queries' : undefined
			)
		);
		await assert.rejects(
			f.receiver.accept({ ...f.grant, chain }, async () => f.source),
			/Invalid bounded/
		);
	});
}

test('refuses an incompatible ancestor scope', async () => {
	const f = await fixture();
	const first = f.grant.chain.delegations[0];
	const chain = DelegationChain.fromDelegations(
		[
			{
				...first,
				delegation: new Delegation(first.delegation.pubkey, first.delegation.expiration, [
					Principal.fromText('aaaaa-aa')
				])
			},
			...f.grant.chain.delegations.slice(1)
		],
		f.grant.chain.publicKey
	);
	await assert.rejects(
		f.receiver.accept({ ...f.grant, chain }, async () => f.source),
		/Invalid bounded/
	);
});

for (const kind of ['expired', 'extended', 'nan'] as const) {
	test(`refuses ${kind} deadline`, async () => {
		const f = await fixture();
		const expiresAtMs =
			kind === 'expired' ? Date.now() - 1 : kind === 'extended' ? f.grant.expiresAtMs + 1 : NaN;
		await assert.rejects(f.receiver.accept({ ...f.grant, expiresAtMs }, async () => f.source));
	});
}

test('refuses an app delegation for a different account', async () => {
	const f = await fixture();
	await assert.rejects(
		f.receiver.accept(
			{ ...f.grant, expectedAccount: f.native.getPrincipal() },
			async () => f.source
		)
	);
});

test('refuses an app grant that outlives the original deadline', async () => {
	const f = await fixture();
	await assert.rejects(
		f.receiver.accept(f.grant, async () => ({
			mint: (key) =>
				DelegationChain.create(
					f.account,
					{ toDer: () => key },
					new Date(f.grant.expiresAtMs + 60_000)
				)
		})),
		/exceeds the session deadline/
	);
});

test('one handoff cannot be consumed twice', async () => {
	const f = await fixture();
	try {
		await f.receiver.accept(f.grant, async () => f.source);
		await assert.rejects(
			f.receiver.accept(f.grant, async () => f.source),
			/already consumed/
		);
	} finally {
		f.receiver.close();
	}
});

test('close cancels a pending minter setup', async () => {
	const f = await fixture();
	let release: (source: AppDelegationSource) => void = () => assert.fail('not waiting');
	const waiting = new Promise<AppDelegationSource>((resolve) => {
		release = resolve;
	});
	const accepted = f.receiver.accept(f.grant, async () => waiting);
	f.receiver.close();
	release(f.source);
	await assert.rejects(accepted, /session has ended/);
});

test('a retained identity cannot sign after close', async () => {
	const f = await fixture();
	const identity = await f.receiver.accept(f.grant, async () => f.source);
	f.receiver.close();
	await assert.rejects(identity.sign(new Uint8Array([1])), /session has ended/);
	assert.throws(() => identity.getDelegation(), /session has ended/);
});

test('a retained identity cannot sign after expiry', async () => {
	const f = await fixture();
	const identity = await f.receiver.accept(f.grant, async () => f.source);
	const original = Date.now;
	try {
		Date.now = () => f.grant.expiresAtMs;
		await assert.rejects(identity.sign(new Uint8Array([1])), /session has ended/);
	} finally {
		Date.now = original;
		f.receiver.close();
	}
});

test('a network failure does not produce a usable or anonymous identity', async () => {
	const f = await fixture();
	await assert.rejects(
		f.receiver.accept(f.grant, async (_options: SessionMinterOptions) => {
			throw new Error('fixture network unavailable');
		}),
		/network unavailable/
	);
	await assert.rejects(
		f.receiver.accept(f.grant, async () => f.source),
		/already consumed/
	);
});

// This verifies actual Swift/Rust signatures with the independently encoded JS
// payload. All credentials here are generated fixtures, not a real II grant.
test('Swift/Rust local hops verify in JS and enter the public web session APIs', async () => {
	const executable = process.env.OISY_HANDOFF_VECTOR;
	assert.ok(executable, 'compile HandoffVector.swift and set OISY_HANDOFF_VECTOR');
	const f = await fixture();
	try {
		const result = spawnSync(executable, [], {
			input: JSON.stringify({
				publicKeyBase64: Buffer.from(f.receiver.publicKey).toString('base64'),
				expiresAtMs: f.grant.expiresAtMs
			}),
			encoding: 'utf8',
			timeout: 10_000,
			maxBuffer: 65_536
		});
		assert.equal(result.status, 0, 'Swift fixture generator failed');
		const chain = DelegationChain.fromJSON(result.stdout);
		let keyDer = chain.publicKey;
		for (const { delegation, signature } of chain.delegations) {
			const key = await crypto.subtle.importKey('spki', new Uint8Array(keyDer), 'Ed25519', false, [
				'verify'
			]);
			const message = new Uint8Array([
				...IC_REQUEST_AUTH_DELEGATION_DOMAIN_SEPARATOR,
				...requestIdOf({ ...delegation })
			]);
			assert.equal(
				await crypto.subtle.verify('Ed25519', key, new Uint8Array(signature), message),
				true
			);
			message[message.length - 1] ^= 1;
			assert.equal(
				await crypto.subtle.verify('Ed25519', key, new Uint8Array(signature), message),
				false
			);
			keyDer = delegation.pubkey;
		}
		const identity = await f.receiver.accept({ ...f.grant, chain }, async () => f.source);
		assert.equal(identity.getPrincipal().compareTo(f.account.getPrincipal()), 'eq');
	} finally {
		f.receiver.close();
	}
});

test('close during an actual mint discards its late result', async () => {
	const f = await fixture();
	let release: () => void = () => assert.fail('not waiting');
	let started: () => void = () => assert.fail('not started');
	const waiting = new Promise<void>((resolve) => {
		release = resolve;
	});
	const entered = new Promise<void>((resolve) => {
		started = resolve;
	});
	const accepted = f.receiver.accept(f.grant, async () => ({
		async mint(key) {
			started();
			await waiting;
			return f.source.mint(key);
		}
	}));
	await entered;
	f.receiver.close();
	release();
	await assert.rejects(accepted, /session has ended/);
});
