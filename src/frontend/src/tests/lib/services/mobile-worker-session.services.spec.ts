import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	connectMobileWorkerSession,
	installMobileWorkerSession
} from '$lib/services/mobile-worker-session.services';
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from '@icp-sdk/core/identity';

vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));

describe('mobile worker delegation', () => {
	const provider = AuthClientProvider.getInstance();
	let identity: DelegationIdentity;

	beforeEach(async () => {
		vi.restoreAllMocks();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
		const root = Ed25519KeyIdentity.generate();
		const sessionKey = Ed25519KeyIdentity.generate();
		identity = DelegationIdentity.fromDelegation(
			sessionKey,
			await DelegationChain.create(
				root,
				sessionKey.getPublicKey(),
				new Date(Date.now() + 3_600_000)
			)
		);
		provider.setMobileIdentity(identity);
	});

	afterEach(() => {
		provider.reset();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('rejects workers without a live session, with no browser authentication fallback', async () => {
		provider.setMobileIdentity(undefined);
		const create = vi.spyOn(provider, 'createAuthClient');
		const worker = {
			postMessage: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		};

		await expect(connectMobileWorkerSession({ worker, onSessionGone: vi.fn() })).rejects.toThrow(
			'unavailable'
		);
		expect(worker.postMessage).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it('does not give a new worker access after the fixed deadline', async () => {
		vi.setSystemTime(Date.now() + 60 * 60_000);
		const worker = {
			postMessage: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		};

		await expect(connectMobileWorkerSession({ worker, onSessionGone: vi.fn() })).rejects.toThrow(
			'unavailable'
		);
		expect(worker.postMessage).not.toHaveBeenCalled();
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
