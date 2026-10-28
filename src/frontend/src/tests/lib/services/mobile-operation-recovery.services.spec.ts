import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { getUserUnusedBalance, withdraw } from '$lib/api/icp-swap-pool.api';
import { ZERO } from '$lib/constants/app.constants';
import type { MobileIcpSwapOperation } from '$lib/schema/mobile-operation.schema';
import { readEvmSourceTxOutcome } from '$lib/services/evm-source-tx.services';
import {
	assertMobileOperationSession,
	finishMobileOperation,
	loadMobileOperations,
	saveMobileOperation
} from '$lib/services/mobile-operation-journal.services';
import {
	MOBILE_RECOVERY_DELAY_MS,
	reconcileMobileEthSend,
	recoverMobileIcpSwap,
	releaseMobileApproval
} from '$lib/services/mobile-operation-recovery.services';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
vi.mock('$lib/api/icp-swap-factory.api');
vi.mock('$lib/api/icp-swap-pool.api');
vi.mock('$lib/services/evm-source-tx.services');
vi.mock('$lib/services/mobile-operation-journal.services');

describe('mobile operation reconciliation', () => {
	const destination = { ...mockValidIcrcToken, network: ICP_TOKEN.network };
	let operation: MobileIcpSwapOperation;

	beforeEach(() => {
		vi.resetAllMocks();
		operation = {
			id: crypto.randomUUID(),
			kind: 'icpSwap',
			pool: mockPrincipal.toText(),
			source: ICP_TOKEN.ledgerCanisterId,
			destination: destination.ledgerCanisterId,
			sourceSymbol: 'ICP',
			destinationSymbol: destination.symbol,
			amount: '10000',
			stage: 'swap',
			createdAt: Date.now() - MOBILE_RECOVERY_DELAY_MS - 100,
			updatedAt: Date.now() - MOBILE_RECOVERY_DELAY_MS - 100
		};
		vi.mocked(loadMobileOperations).mockResolvedValue([operation]);
		vi.mocked(getPoolCanister).mockResolvedValue({
			canisterId: mockPrincipal,
			token0: { address: operation.source, standard: 'ICRC2' },
			token1: { address: operation.destination, standard: 'ICRC2' }
		} as PoolData);
		vi.mocked(getUserUnusedBalance).mockResolvedValue({
			balance0: ICP_TOKEN.fee + 100n,
			balance1: ZERO
		});
	});

	const recover = () =>
		recoverMobileIcpSwap({ identity: mockIdentity, operation, tokens: [ICP_TOKEN, destination] });

	it('withdraws only certified available balances and never repeats the swap', async () => {
		await recover();

		expect(getPoolCanister).toHaveBeenCalledWith(expect.objectContaining({ certified: true }));
		expect(getUserUnusedBalance).toHaveBeenCalledWith(expect.objectContaining({ certified: true }));
		expect(withdraw).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			canisterId: operation.pool,
			token: operation.source,
			amount: ICP_TOKEN.fee + 100n,
			fee: ICP_TOKEN.fee
		});
		expect(saveMobileOperation).toHaveBeenCalledWith(
			expect.objectContaining({
				expected: operation,
				operation: expect.objectContaining({ stage: 'recovery' })
			})
		);
		expect(saveMobileOperation).toHaveBeenLastCalledWith(
			expect.objectContaining({ operation: expect.objectContaining({ stage: 'recovered' }) })
		);
		expect(finishMobileOperation).not.toHaveBeenCalled();
	});

	it('never claims recovery after a failed withdrawal', async () => {
		vi.mocked(withdraw).mockRejectedValue(new Error('timeout'));

		await expect(recover()).rejects.toThrow();
		expect(saveMobileOperation).toHaveBeenCalledOnce();
		expect(finishMobileOperation).not.toHaveBeenCalled();
	});

	it('waits before recovery and rejects changed pool mapping', async () => {
		operation.updatedAt = Date.now();

		await expect(recover()).rejects.toThrow();
		expect(getPoolCanister).not.toHaveBeenCalled();

		operation.updatedAt -= MOBILE_RECOVERY_DELAY_MS + 1;
		vi.mocked(getPoolCanister).mockRejectedValue(new Error('Pool unavailable'));

		await expect(recover()).rejects.toThrow();
		expect(withdraw).not.toHaveBeenCalled();
	});

	it('does not interpret zero unused balance as proof that an unknown swap failed', async () => {
		vi.mocked(getUserUnusedBalance).mockResolvedValue({ balance0: ZERO, balance1: ZERO });

		await expect(recover()).rejects.toThrow();
		expect(withdraw).not.toHaveBeenCalled();
		expect(finishMobileOperation).not.toHaveBeenCalled();
	});

	it('does not withdraw if ownership/CAS or session checking fails', async () => {
		vi.mocked(saveMobileOperation).mockRejectedValue(new Error('stale'));

		await expect(recover()).rejects.toThrow();
		expect(withdraw).not.toHaveBeenCalled();

		vi.mocked(assertMobileOperationSession).mockRejectedValue(new Error('expired'));

		await expect(recover()).rejects.toThrow();
	});

	it('releases only an old approval-only record with its expected snapshot', async () => {
		await releaseMobileApproval({ identity: mockIdentity, operation });

		expect(finishMobileOperation).not.toHaveBeenCalled();

		operation.stage = 'approval';
		await releaseMobileApproval({ identity: mockIdentity, operation });

		expect(finishMobileOperation).toHaveBeenCalledWith({
			identity: mockIdentity,
			id: operation.id,
			expected: operation
		});
	});

	it.each(['pending', 'unknown', 'succeeded', 'reverted', 'replaced'] as const)(
		'uses the existing receipt/nonce verdict: %s',
		async (outcome) => {
			vi.mocked(readEvmSourceTxOutcome).mockResolvedValue(outcome);
			const result = await reconcileMobileEthSend({
				identity: mockIdentity,
				operation: {
					id: crypto.randomUUID(),
					kind: 'evmSend',
					createdAt: 1,
					chainId: '1',
					from: `0x${'1'.repeat(40)}`,
					to: `0x${'2'.repeat(40)}`,
					symbol: 'ETH',
					hash: `0x${'a'.repeat(64)}`,
					nonce: 1
				}
			});

			expect(result).toBe(outcome);
			expect(finishMobileOperation).toHaveBeenCalledTimes(
				['succeeded', 'reverted', 'replaced'].includes(outcome) ? 1 : 0
			);
		}
	);
});
