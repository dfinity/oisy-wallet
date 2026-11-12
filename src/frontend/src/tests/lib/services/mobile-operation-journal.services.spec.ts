import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as mobile from '$lib/constants/mobile.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { MobileIcpSwapOperation } from '$lib/schema/mobile-operation.schema';
import { requestMobileWallet } from '$lib/services/mobile-host.services';
import {
	finishMobileOperation,
	loadMobileOperations,
	MobileOperationPendingError,
	MobileOperationSessionExpiredError,
	persistMobileEthSend,
	saveMobileOperation
} from '$lib/services/mobile-operation-journal.services';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/services/mobile-host.services', () => ({ requestMobileWallet: vi.fn() }));
const operation: MobileIcpSwapOperation = {
	id: 'cc5236a5-747c-4a58-82b8-fd4213e6ea91',
	kind: 'icpSwap',
	createdAt: 1,
	updatedAt: 1,
	pool: 'aaaaa-aa',
	source: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
	destination: 'mxzaz-hqaaa-aaaar-qaada-cai',
	sourceSymbol: 'ICP',
	destinationSymbol: 'ckBTC',
	amount: '10000',
	stage: 'approval'
};

describe('mobile operation journal', () => {
	let revision: string;
	let value: string;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(mobile, 'MOBILE_SHELL', 'get').mockReturnValue(true);
		vi.spyOn(AuthClientProvider.getInstance(), 'loadIdentity').mockResolvedValue(mockIdentity);
		revision = '';
		value = '[]';
		vi.mocked(requestMobileWallet).mockImplementation((request) => {
			if (request.method === 'writeOperations') {
				if (request.revision !== revision) {
					throw new Error('conflict');
				}
				({ value } = request);
				revision = crypto.randomUUID();
			}
			return Promise.resolve(JSON.stringify({ revision, value }));
		});
	});

	afterEach(() => vi.restoreAllMocks());

	it('persists and reloads only bounded metadata', async () => {
		await saveMobileOperation({ identity: mockIdentity, operation, create: true });

		await expect(loadMobileOperations(mockIdentity)).resolves.toEqual([operation]);
		expect(requestMobileWallet).toHaveBeenCalledWith(
			expect.objectContaining({ method: 'writeOperations', revision: '' })
		);
		expect(JSON.parse(value)).toEqual([operation]);
	});

	it('fails closed for another or expired session before reading storage', async () => {
		vi.mocked(AuthClientProvider.getInstance().loadIdentity).mockResolvedValue(undefined);

		await expect(loadMobileOperations(mockIdentity)).rejects.toBeInstanceOf(
			MobileOperationSessionExpiredError
		);
		expect(requestMobileWallet).not.toHaveBeenCalled();
	});

	it('rejects malformed stored records rather than ignoring them and permitting a duplicate', async () => {
		value = '[{"kind":"unknown"}]';

		await expect(loadMobileOperations(mockIdentity)).rejects.toThrow();
	});

	it('keeps one active operation per pool, including after a reload', async () => {
		await saveMobileOperation({ identity: mockIdentity, operation, create: true });

		await expect(
			saveMobileOperation({
				identity: mockIdentity,
				operation: { ...operation, id: crypto.randomUUID() },
				create: true
			})
		).rejects.toBeInstanceOf(MobileOperationPendingError);
		expect(JSON.parse(value)).toHaveLength(1);
	});

	it('rejects a stale stage update and deletion even when the journal revision was reloaded', async () => {
		await saveMobileOperation({ identity: mockIdentity, operation, create: true });
		const recovery = { ...operation, stage: 'recovery' as const, updatedAt: 2 };
		await saveMobileOperation({ identity: mockIdentity, operation: recovery, expected: operation });

		await expect(
			saveMobileOperation({
				identity: mockIdentity,
				operation: { ...operation, stage: 'deposit' },
				expected: operation
			})
		).rejects.toBeInstanceOf(MobileOperationPendingError);
		await expect(
			finishMobileOperation({ identity: mockIdentity, id: operation.id, expected: operation })
		).rejects.toBeInstanceOf(MobileOperationPendingError);
		expect(JSON.parse(value)).toEqual([recovery]);
	});

	it('does not recreate a removed operation from a suspended stage continuation', async () => {
		await saveMobileOperation({ identity: mockIdentity, operation, create: true });
		await finishMobileOperation({ identity: mockIdentity, id: operation.id, expected: operation });

		await expect(
			saveMobileOperation({
				identity: mockIdentity,
				operation: { ...operation, stage: 'deposit' },
				expected: operation
			})
		).rejects.toThrow();
	});

	it('propagates a native revision conflict without retrying a financial step', async () => {
		vi.mocked(requestMobileWallet).mockImplementation((request) => {
			if (request.method === 'writeOperations') {
				throw new Error('conflict');
			}
			return Promise.resolve(JSON.stringify({ revision: '', value: '[]' }));
		});

		await expect(
			saveMobileOperation({ identity: mockIdentity, operation, create: true })
		).rejects.toThrow('conflict');
		expect(requestMobileWallet).toHaveBeenCalledTimes(2);
	});

	it('blocks a second pending EVM send on the same chain/sender', async () => {
		const send = {
			identity: mockIdentity,
			token: ETHEREUM_TOKEN,
			from: `0x${'1'.repeat(40)}`,
			to: `0x${'2'.repeat(40)}`,
			hash: `0x${'a'.repeat(64)}`,
			nonce: 1
		};
		await persistMobileEthSend(send);

		await expect(
			persistMobileEthSend({ ...send, nonce: 2, hash: `0x${'b'.repeat(64)}` })
		).rejects.toBeInstanceOf(MobileOperationPendingError);
	});
});
