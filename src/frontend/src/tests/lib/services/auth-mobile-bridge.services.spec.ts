import { signInMobileAuthBridge } from '$lib/services/auth-mobile-bridge.services';
import { uint8ArrayToHexString } from '@dfinity/utils';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';

const signInMock = vi.fn();
let capturedOptions: { storage: { set: (k: string, v: string) => Promise<void> } } | undefined;

vi.mock('@icp-sdk/auth/client', () => ({
	KEY_STORAGE_DELEGATION: 'delegation',
	AuthClient: class {
		constructor(options: { storage: { set: (k: string, v: string) => Promise<void> } }) {
			capturedOptions = options;
		}

		signIn = (...args: unknown[]) => signInMock(capturedOptions, ...args);
	}
}));

describe('auth-mobile-bridge services', () => {
	const sessionPublicKeyDerHex = uint8ArrayToHexString(
		Ed25519KeyIdentity.generate().getPublicKey().toDer()
	);
	const delegationChainJson = JSON.stringify({ delegations: [], publicKey: 'aa' });

	beforeEach(() => {
		vi.clearAllMocks();
		capturedOptions = undefined;
	});

	it('should return the delegation chain on a clean sign-in', async () => {
		signInMock.mockImplementation(async (options) => {
			await options.storage.set('delegation', delegationChainJson);
		});

		await expect(signInMobileAuthBridge({ sessionPublicKeyDerHex })).resolves.toEqual({
			delegationChainJson
		});
	});

	it('should return the chain even when signIn rejects AFTER persisting it', async () => {
		// Reproduces @icp-sdk/auth v6: the chain is persisted before the session
		// key, and the key serializer throws "Unsupported key type" for
		// PartialIdentity — a successful II auth that still rejects.
		signInMock.mockImplementation(async (options) => {
			await options.storage.set('delegation', delegationChainJson);
			throw new Error('Unsupported key type');
		});

		await expect(signInMobileAuthBridge({ sessionPublicKeyDerHex })).resolves.toEqual({
			delegationChainJson
		});
	});

	it('should rethrow the sign-in error when no chain was persisted', async () => {
		signInMock.mockRejectedValue(new Error('UserInterrupt'));

		await expect(signInMobileAuthBridge({ sessionPublicKeyDerHex })).rejects.toThrow(
			'UserInterrupt'
		);
	});
});
