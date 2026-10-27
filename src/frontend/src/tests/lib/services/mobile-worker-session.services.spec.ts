import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	connectMobileWorkerSession,
	installMobileWorkerSession,
	mobileWorkerInitSchema
} from '$lib/services/mobile-worker-session.services';
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from '@icp-sdk/core/identity';

vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));

describe('mobile worker delegation', () => {
	const provider = AuthClientProvider.getInstance();
	let identity: DelegationIdentity;

	beforeEach(async () => {
		vi.restoreAllMocks();
		const root = Ed25519KeyIdentity.generate();
		const sessionKey = Ed25519KeyIdentity.generate();
		identity = DelegationIdentity.fromDelegation(
			sessionKey,
			await DelegationChain.create(root, sessionKey.getPublicKey(), new Date(Date.now() + 60_000))
		);
		provider.setMobileIdentity(identity);
	});

	afterEach(() => {
		provider.reset();
		vi.restoreAllMocks();
	});

	it('gives each worker its own key with the same principal and bounded expiry, without IDB', async () => {
		const storageRead = vi.spyOn(provider.storage, 'get');
		const storageWrite = vi.spyOn(provider.storage, 'set');
		const installed: DelegationIdentity[] = [];
		vi.spyOn(provider, 'setMobileIdentity').mockImplementation((value) => {
			if (value) {
				installed.push(value);
			}
		});
		const messages: unknown[] = [];
		const jobs: Promise<void>[] = [];
		const worker = {
			postMessage: vi.fn(
				(...[message, options]: [unknown, (Transferable[] | StructuredSerializeOptions)?]) => {
					messages.push(message);
					const [port] = Array.isArray(options) ? options : (options?.transfer ?? []);
					if (!(port instanceof MessagePort)) {
						throw new Error('Missing dedicated port');
					}
					jobs.push(
						installMobileWorkerSession({ port, session: mobileWorkerInitSchema.parse(message) })
					);
				}
			)
		};
		await connectMobileWorkerSession(worker);
		await connectMobileWorkerSession(worker);
		await Promise.all(jobs);

		expect(installed).toHaveLength(2);

		for (const workerIdentity of installed) {
			expect(workerIdentity.getPrincipal().toText()).toBe(identity.getPrincipal().toText());

			const chain = workerIdentity.getDelegation();

			expect(chain.delegations).toHaveLength(2);
			expect(chain.delegations.at(-1)?.delegation.expiration).toBeLessThanOrEqual(
				identity.getDelegation().delegations[0].delegation.expiration
			);
			await expect(workerIdentity.sign(new Uint8Array([1, 2, 3]))).resolves.toHaveLength(64);
		}

		expect(installed[0].getDelegation().delegations.at(-1)?.delegation.pubkey).not.toEqual(
			installed[1].getDelegation().delegations.at(-1)?.delegation.pubkey
		);
		expect(messages.every((value) => mobileWorkerInitSchema.safeParse(value).success)).toBeTruthy();
		expect(storageRead).not.toHaveBeenCalled();
		expect(storageWrite).not.toHaveBeenCalled();
	});

	it('rejects workers without a live session, with no browser authentication fallback', async () => {
		provider.setMobileIdentity(undefined);
		const create = vi.spyOn(provider, 'createAuthClient');
		const worker = { postMessage: vi.fn() };

		await expect(connectMobileWorkerSession(worker)).rejects.toThrow('unavailable');
		expect(worker.postMessage).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it('rejects a late worker key after sign-out', async () => {
		const worker = {
			postMessage: vi.fn(
				(...[_message, options]: [unknown, (Transferable[] | StructuredSerializeOptions)?]) => {
					const [port] = Array.isArray(options) ? options : (options?.transfer ?? []);
					if (!(port instanceof MessagePort)) {
						throw new Error('Missing port');
					}
					provider.setMobileIdentity(undefined);
					port.postMessage({
						publicKey: Buffer.from(Ed25519KeyIdentity.generate().getPublicKey().toDer()).toString(
							'hex'
						)
					});
				}
			)
		};

		await expect(connectMobileWorkerSession(worker)).rejects.toThrow('rejected');
	});

	it('rejects a delegation for another account before installing it', async () => {
		const channel = new MessageChannel();
		const installed = vi.spyOn(provider, 'setMobileIdentity');
		const session = {
			msg: 'mobileSession' as const,
			generation: crypto.randomUUID(),
			principal: '2vxsx-fae',
			expiresAt: Date.now() + 60_000
		};
		channel.port1.onmessage = () =>
			channel.port1.postMessage({
				generation: session.generation,
				chain: JSON.stringify(identity.getDelegation().toJSON())
			});

		await expect(installMobileWorkerSession({ port: channel.port2, session })).rejects.toThrow(
			'rejected'
		);
		expect(installed).not.toHaveBeenCalled();

		channel.port1.close();
	});
});
