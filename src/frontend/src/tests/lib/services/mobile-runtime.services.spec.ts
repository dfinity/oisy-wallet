import { AppWorker } from '$lib/services/_worker.services';
import {
	connectMobileHost,
	requestMobileWallet,
	setMobilePresentation
} from '$lib/services/mobile-host.services';
import type * as MobileSession from '$lib/services/mobile-session.services';
import {
	createMobileIdentity,
	type MobileSDKIdentity
} from '$lib/services/mobile-session.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));
vi.mock('$lib/services/_worker.services', () => ({ AppWorker: { terminateAllWorkers: vi.fn() } }));
vi.mock('$lib/services/wallet-refresh.services', () => ({ cancelWalletRefresh: vi.fn() }));
vi.mock('$lib/services/mobile-host.services', () => ({
	connectMobileHost: vi.fn(),
	requestMobileWallet: vi.fn(),
	setMobilePresentation: vi.fn()
}));
vi.mock('$lib/services/mobile-session.services', async (importOriginal) => ({
	...(await importOriginal<typeof MobileSession>()),
	createMobileIdentity: vi.fn()
}));
vi.mock('@oisy/mobile-session', () => ({
	isSessionGoneError: (error: unknown) =>
		error instanceof Error && error.name === 'SessionGoneError'
}));

const disconnect = vi.fn();
const close = vi.fn();
const create = vi.mocked(createMobileIdentity);

describe('mobile runtime recovery', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.mocked(connectMobileHost).mockResolvedValue({
			disconnect,
			version: 2,
			mode: 'audit-read-only',
			root: 'wallet',
			runtimeId: crypto.randomUUID(),
			documentId: crypto.randomUUID(),
			hostVersion: '0.1.0',
			environment: 'audit',
			capabilities: ['sessionHandoff']
		});
		vi.mocked(requestMobileWallet).mockResolvedValue('{}');
		vi.mocked(setMobilePresentation).mockResolvedValue();
	});

	it('retains the native session after a transient first mint failure', async () => {
		const runtime = await import('$lib/services/mobile-runtime.services');
		const failure = new Error('Network unavailable');
		create.mockRejectedValue(failure);

		await expect(runtime.initializeMobileRuntime()).rejects.toThrow('Network unavailable');
		await expect(runtime.handleMobileRuntimeFailure(failure)).resolves.toBeTruthy();
		expect(requestMobileWallet).not.toHaveBeenCalled();
		expect(setMobilePresentation).toHaveBeenCalledWith(true);
		expect(disconnect).toHaveBeenCalledOnce();
		expect(AppWorker.terminateAllWorkers).toHaveBeenCalledOnce();
	});

	it('retains the native session but clears Explore after a transient AuthWorker failure', async () => {
		const runtime = await import('$lib/services/mobile-runtime.services');
		const grantID = crypto.randomUUID();
		const expiresAt = Date.now() + 3_600_000;
		const identity = mock<MobileSDKIdentity>({ getPrincipal: () => mockIdentity.getPrincipal() });
		create.mockResolvedValue({ identity, close, grantID, expiresAt });
		await runtime.initializeMobileRuntime();

		await expect(
			runtime.handleMobileRuntimeFailure(new Error('Worker session timed out'))
		).resolves.toBeTruthy();
		expect(close).toHaveBeenCalledOnce();
		expect(requestMobileWallet).toHaveBeenCalledExactlyOnceWith({
			method: 'account',
			grantID,
			principal: identity.getPrincipal().toText()
		});
	});

	it('ends the native session once for terminal SDK loss, including a concurrent failure handler', async () => {
		const runtime = await import('$lib/services/mobile-runtime.services');
		const terminal = new Error('Revoked');
		terminal.name = 'SessionGoneError';

		await expect(runtime.handleMobileRuntimeFailure(terminal)).resolves.toBeFalsy();

		await runtime.endMobileRuntime();

		expect(requestMobileWallet).toHaveBeenCalledExactlyOnceWith({ method: 'sessionExpired' });
		expect(AppWorker.terminateAllWorkers).toHaveBeenCalledOnce();
	});
});
