import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { requestMobileWallet } from '$lib/services/mobile-host.services';
import { createMobileIdentity } from '$lib/services/mobile-session.services';
import {
	connectMobileWorkerSession,
	installMobileWorkerSession,
	mobileWorkerInitSchema
} from '$lib/services/mobile-worker-session.services';
import { freshIIDelegationChain } from '$lib/utils/delegation.utils';
import {
	Cbor,
	Endpoint,
	Expiry,
	IC_REQUEST_DOMAIN_SEPARATOR,
	ReadRequestType,
	SubmitRequestType,
	requestIdOf,
	type HttpAgentRequest
} from '@icp-sdk/core/agent';
import {
	DelegationChain,
	Ed25519KeyIdentity,
	type DelegationIdentity
} from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import type * as MobileSessionSDK from '@oisy/mobile-session';
import * as z from 'zod';

vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));
vi.mock('$lib/services/mobile-host.services', () => ({ requestMobileWallet: vi.fn() }));
vi.mock('@oisy/mobile-session', async (importOriginal) => {
	const actual = await importOriginal<typeof MobileSessionSDK>();
	return {
		...actual,
		prepareWebSession: async (options?: Parameters<typeof actual.prepareWebSession>[0]) => {
			const prepared = await actual.prepareWebSession(options);
			const { accept } = prepared;
			prepared.accept = ({ grant }) =>
				accept({
					grant,
					makeMinter: () =>
						Promise.resolve({
							mint: async (key) => {
								if (mintFailure) {
									throw mintFailure;
								}
								const chain = await DelegationChain.create(
									account,
									{ toDer: () => key },
									new Date(Math.min(grant.expiresAtMs, Date.now() + 300_000))
								);
								return actual.parseSessionGrant({
									chain: JSON.stringify(chain.toJSON()),
									principal: account.getPrincipal().toText(),
									expiresAt: grant.expiresAtMs
								}).chain;
							}
						})
				});
			return prepared;
		}
	};
});

let mintFailure: Error | undefined;
const account = Ed25519KeyIdentity.generate();
const native = Ed25519KeyIdentity.generate();
const root = Ed25519KeyIdentity.generate();
const ii = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
const host = vi.mocked(requestMobileWallet);
const provider = AuthClientProvider.getInstance();
const sessions: Awaited<ReturnType<typeof createMobileIdentity>>[] = [];
const nativeGrant = async ({
	message,
	lifetime = 3_600_000
}: {
	message: Record<string, string>;
	lifetime?: number;
}) => {
	const { publicKey } = z.object({ publicKey: z.string() }).parse(message);
	const expiresAt = Date.now() + lifetime;
	const previous = await DelegationChain.create(root, native.getPublicKey(), new Date(expiresAt), {
		targets: [ii]
	});
	const chain = await DelegationChain.create(
		native,
		{ toDer: () => new Uint8Array(Buffer.from(publicKey, 'base64')) },
		new Date(expiresAt),
		{ previous, targets: [ii] }
	);
	return {
		version: 1,
		id: crypto.randomUUID(),
		principal: account.getPrincipal().toText(),
		expiresAt,
		chain: chain.toJSON()
	};
};
const open = async () => {
	const session = await createMobileIdentity();
	sessions.push(session);
	return session;
};

describe('SDK session in the shared wallet', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mintFailure = undefined;
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-05T17:00:00Z'));
		host.mockImplementation(async (request) =>
			JSON.stringify(await nativeGrant({ message: request }))
		);
	});

	afterEach(() => {
		sessions.splice(0).forEach((session) => session.close());
		provider.reset();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('uses the app principal and a one-link II app proof, not the native session principal', async () => {
		const session = await open();

		expect(session.identity.getPrincipal().toText()).toBe(account.getPrincipal().toText());
		expect(session.identity.getPrincipal().toText()).not.toBe(root.getPrincipal().toText());
		expect(session.identity.getDelegation().delegations).toHaveLength(1);
		expect(session.expiresAt - Date.now()).toBe(3_600_000);

		provider.setMobileIdentity(session.identity);

		expect(provider.mobileSessionExpiresAt).toBe(session.expiresAt);
		// Five-minute app credentials must not shorten the user session to five minutes.
		expect(
			Number(session.identity.getDelegation().delegations[0].delegation.expiration / 1_000_000n)
		).toBeLessThan(session.expiresAt);
	});

	it('signs a Core 4 wallet request through the SDK without changing its wire payload', async () => {
		const session = await open();
		const request: HttpAgentRequest = {
			endpoint: Endpoint.Call,
			request: { method: 'POST' },
			body: {
				request_type: SubmitRequestType.Call,
				canister_id: Principal.fromText('aaaaa-aa'),
				method_name: 'whoami',
				arg: new Uint8Array([68, 73, 68, 76, 0, 0]),
				sender: account.getPrincipal(),
				ingress_expiry: Expiry.fromDeltaInMilliseconds(60_000)
			}
		};
		const signed = z
			.object({
				body: z.object({
					content: z.record(z.string(), z.unknown()),
					sender_sig: z.instanceof(Uint8Array)
				})
			})
			.parse(await session.identity.transformRequest(request));

		expect(requestIdOf(signed.body.content)).toEqual(requestIdOf(request.body));
		expect(Cbor.decode(Cbor.encode(signed.body.content))).toStrictEqual(
			Cbor.decode(Cbor.encode(request.body))
		);

		const chain = session.identity.getDelegation();
		const key = await crypto.subtle.importKey(
			'spki',
			new Uint8Array(chain.delegations[0].delegation.pubkey),
			{ name: 'ECDSA', namedCurve: 'P-256' },
			false,
			['verify']
		);
		const bytes = new Uint8Array([...IC_REQUEST_DOMAIN_SEPARATOR, ...requestIdOf(request.body)]);

		await expect(
			crypto.subtle.verify(
				{ name: 'ECDSA', hash: 'SHA-256' },
				key,
				new Uint8Array(signed.body.sender_sig),
				bytes
			)
		).resolves.toBeTruthy();
	});

	it.each(['query', 'read_state', 'call-with-nonce'])(
		'preserves the encoded %s request across SDK versions',
		async (kind) => {
			const session = await open();
			const common = {
				sender: account.getPrincipal(),
				ingress_expiry: Expiry.fromDeltaInMilliseconds(60_000)
			};
			const call = {
				...common,
				canister_id: Principal.fromText('aaaaa-aa'),
				method_name: 'whoami',
				arg: new Uint8Array([68, 73, 68, 76, 0, 0])
			};
			const request: HttpAgentRequest =
				kind === 'read_state'
					? {
							endpoint: Endpoint.ReadState,
							request: { method: 'POST' },
							body: {
								...common,
								request_type: ReadRequestType.ReadState,
								paths: [[new TextEncoder().encode('time')]]
							}
						}
					: kind === 'query'
						? {
								endpoint: Endpoint.Query,
								request: { method: 'POST' },
								body: { ...call, request_type: ReadRequestType.Query }
							}
						: {
								endpoint: Endpoint.Call,
								request: { method: 'POST' },
								body: {
									...call,
									request_type: SubmitRequestType.Call,
									nonce: Object.assign(new Uint8Array([1, 2, 3]), { __nonce__: undefined })
								}
							};
			const signed = z
				.object({ body: z.object({ content: z.record(z.string(), z.unknown()) }) })
				.parse(await session.identity.transformRequest(request));

			expect(Cbor.decode(Cbor.encode(signed.body.content))).toStrictEqual(
				Cbor.decode(Cbor.encode(request.body))
			);
		}
	);

	it('retains only the original remaining time on reload', async () => {
		host.mockImplementation(async (request) =>
			JSON.stringify(await nativeGrant({ message: request, lifetime: 60_000 }))
		);

		expect((await open()).expiresAt).toBe(Date.now() + 60_000);
	});

	it.each(['long', 'expired', 'wrong-key', 'wrong-account', 'wrong-version', 'unrestricted'])(
		'rejects %s grants',
		async (kind) => {
			host.mockImplementation(async (request) => {
				const grant = await nativeGrant({
					message:
						kind === 'wrong-key'
							? { publicKey: Buffer.from(root.getPublicKey().toDer()).toString('base64') }
							: request,
					lifetime: kind === 'long' ? 3_900_000 : 60_000
				});
				if (kind === 'expired') {
					vi.setSystemTime(Date.now() + 60_000);
				}
				if (kind === 'wrong-account') {
					grant.principal = root.getPrincipal().toText();
				}
				if (kind === 'wrong-version') {
					grant.version = 2;
				}
				if (kind === 'unrestricted') {
					delete grant.chain.delegations[1].delegation.targets;
				}
				return JSON.stringify(grant);
			});

			await expect(open()).rejects.toThrow();
		}
	);

	it('does not request a native grant after the document was cancelled', async () => {
		const cancellation = new AbortController();
		cancellation.abort();

		await expect(createMobileIdentity({ signal: cancellation.signal })).rejects.toThrow(
			'Session ended'
		);
		expect(host).not.toHaveBeenCalled();
	});

	it('rejects a native reply arriving after logout', async () => {
		const cancellation = new AbortController();
		host.mockImplementation(async (request) => {
			const grant = await nativeGrant({ message: request });
			cancellation.abort();
			return JSON.stringify(grant);
		});

		await expect(createMobileIdentity({ signal: cancellation.signal })).rejects.toThrow(
			'cancelled'
		);
	});

	it('rejects oversized payloads before SDK parsing', async () => {
		host.mockResolvedValue('a'.repeat(65_537));

		await expect(open()).rejects.toThrow('Oversized');
	});

	it('disables retained signers on close and at the original deadline', async () => {
		const session = await open();
		session.close();

		await expect(session.identity.sign(new Uint8Array([1]))).rejects.toThrow();

		const second = await open();
		vi.setSystemTime(second.expiresAt);

		await expect(second.identity.sign(new Uint8Array([1]))).rejects.toThrow();
	});

	it('refreshes the II proof before constructing a backend body after sleep', async () => {
		const { identity } = await open();
		const expired = identity.getDelegation().delegations[0].delegation.expiration;
		vi.setSystemTime(Date.now() + 6 * 60_000);

		expect(expired).toBeLessThan(BigInt(Date.now()) * 1_000_000n);

		const [proof] = await freshIIDelegationChain({ identity });

		expect(proof?.delegations[0].delegation.expiration).toBeGreaterThan(
			BigInt(Date.now() + 10_000) * 1_000_000n
		);
	});

	it('does not return stale backend proof if SDK refresh suppresses a transient mint failure', async () => {
		const { identity } = await open();
		vi.setSystemTime(Date.now() + 6 * 60_000);
		mintFailure = new Error('Offline');

		await expect(freshIIDelegationChain({ identity })).rejects.toThrow(
			'fresh Internet Identity proof'
		);
		expect(identity.isActive).toBeTruthy();

		mintFailure = undefined;

		await expect(freshIIDelegationChain({ identity })).resolves.toHaveLength(1);
	});

	it('reports the original deadline once and does not report local disposal as expiry', async () => {
		const onSessionGone = vi.fn();
		const session = await createMobileIdentity({ onSessionGone });
		sessions.push(session);
		vi.setSystemTime(session.expiresAt);

		await expect(session.identity.refresh()).rejects.toThrow('ended');
		await expect(session.identity.refresh()).rejects.toThrow('ended');
		expect(onSessionGone).toHaveBeenCalledOnce();

		const local = await createMobileIdentity({ onSessionGone });
		sessions.push(local);
		local.close();

		expect(onSessionGone).toHaveBeenCalledOnce();
	});

	it('mints independently keyed workers without sharing app or session private keys or using IDB', async () => {
		const session = await open();
		provider.setMobileIdentity(session.identity);
		const read = vi.spyOn(provider.storage, 'get');
		const write = vi.spyOn(provider.storage, 'set');
		const installed: DelegationIdentity[] = [];
		vi.spyOn(provider, 'setMobileIdentity').mockImplementation((value) => {
			if (value) {
				installed.push(value);
			}
		});
		const tasks: Promise<void>[] = [];
		const worker = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			postMessage: vi.fn(
				(...[message, options]: [unknown, (Transferable[] | StructuredSerializeOptions)?]) => {
					const [port] = Array.isArray(options) ? options : (options?.transfer ?? []);
					if (!(port instanceof MessagePort)) {
						throw new Error('Missing private port');
					}
					tasks.push(
						installMobileWorkerSession({ port, session: mobileWorkerInitSchema.parse(message) })
					);
				}
			)
		};
		await connectMobileWorkerSession({ worker, onSessionGone: vi.fn() });
		vi.setSystemTime(Date.now() + 45 * 60_000);
		await connectMobileWorkerSession({ worker, onSessionGone: vi.fn() });
		await Promise.all(tasks);

		expect(installed).toHaveLength(2);

		for (const identity of installed) {
			expect(identity.getPrincipal().toText()).toBe(account.getPrincipal().toText());
			expect(identity.getDelegation().delegations).toHaveLength(1);
		}

		expect(installed[0].getDelegation().delegations[0].delegation.pubkey).not.toEqual(
			installed[1].getDelegation().delegations[0].delegation.pubkey
		);
		expect(read).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});

	it('ignores stale worker terminal notices and reports a matching one only once', async () => {
		const session = await open();
		provider.setMobileIdentity(session.identity);
		const target = new EventTarget();
		let generation = '';
		const tasks: Promise<void>[] = [];
		vi.spyOn(provider, 'setMobileIdentity').mockImplementation(() => undefined);
		const worker = {
			addEventListener: target.addEventListener.bind(target),
			removeEventListener: target.removeEventListener.bind(target),
			postMessage: vi.fn(
				(...[message, options]: [unknown, (Transferable[] | StructuredSerializeOptions)?]) => {
					const init = mobileWorkerInitSchema.parse(message);
					({ generation } = init);
					const [port] = Array.isArray(options) ? options : (options?.transfer ?? []);
					if (!(port instanceof MessagePort)) {
						throw new Error('Missing private port');
					}
					tasks.push(installMobileWorkerSession({ port, session: init }));
				}
			)
		};
		const onSessionGone = vi.fn();
		await connectMobileWorkerSession({ worker, onSessionGone });
		await Promise.all(tasks);
		target.dispatchEvent(
			new MessageEvent('message', {
				data: { msg: 'mobileSessionEnded', generation: crypto.randomUUID() }
			})
		);

		expect(onSessionGone).not.toHaveBeenCalled();

		target.dispatchEvent(
			new MessageEvent('message', { data: { msg: 'mobileSessionEnded', generation } })
		);
		target.dispatchEvent(
			new MessageEvent('message', { data: { msg: 'mobileSessionEnded', generation } })
		);

		expect(onSessionGone).toHaveBeenCalledOnce();
	});

	it('rejects late worker keys after logout', async () => {
		const session = await open();
		provider.setMobileIdentity(session.identity);
		const worker = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			postMessage: vi.fn(
				(...[_message, options]: [unknown, (Transferable[] | StructuredSerializeOptions)?]) => {
					const [port] = Array.isArray(options) ? options : (options?.transfer ?? []);
					if (!(port instanceof MessagePort)) {
						throw new Error('Missing private port');
					}
					session.close();
					provider.setMobileIdentity(undefined);
					port.postMessage({ publicKey: '00'.repeat(91) });
				}
			)
		};

		await expect(connectMobileWorkerSession({ worker, onSessionGone: vi.fn() })).rejects.toThrow(
			'rejected'
		);
	});
});
