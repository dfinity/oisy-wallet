import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { sweepPlugSolBalance } from '$lib/services/plug-sol.services';
import type { Token } from '$lib/types/token';
import { SOLANA_TRANSACTION_FEE_IN_LAMPORTS } from '$sol/constants/sol.constants';
import { sendSol } from '$sol/services/sol-send.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

vi.mock('$sol/services/sol-send.services', () => ({ sendSol: vi.fn() }));
vi.mock('$lib/api/plug-helper.api', () => ({ signPlugSolMessage: vi.fn() }));

const SOURCE = 'EUxq91X9hA2s2qDDHKmS8bHjQ8GX2XMNkakgRiDgksx';
const DESTINATION = '2DZJD4BS96NY1EYe1zq137CQovKaEaQ1cmVwYq8wTaxG';

const nativeSol = { ...mockValidToken, symbol: 'SOL', network: SOLANA_MAINNET_NETWORK } as Token;

const splToken = {
	...mockValidToken,
	standard: { code: 'spl' },
	symbol: 'USD1',
	network: SOLANA_MAINNET_NETWORK,
	address: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
	owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
} as unknown as Token;

describe('sweepPlugSolBalance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(sendSol).mockResolvedValue('sig' as never);
	});

	const call = ({
		token,
		balance,
		nativeBalance = 10n ** 9n
	}: {
		token: Token;
		balance: bigint;
		nativeBalance?: bigint;
	}) =>
		sweepPlugSolBalance({
			identity: mockIdentity,
			token,
			balance,
			nativeBalance,
			destination: DESTINATION,
			source: SOURCE
		});

	describe('native SOL', () => {
		it('reserves the fee out of the amount and injects the imported signer', async () => {
			await call({ token: nativeSol, balance: 10n ** 7n });

			expect(sendSol).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					token: nativeSol,
					amount: 10n ** 7n - SOLANA_TRANSACTION_FEE_IN_LAMPORTS,
					destination: DESTINATION,
					source: SOURCE,
					prioritizationFee: ZERO,
					signerOverride: expect.objectContaining({ address: SOURCE })
				})
			);
		});

		it('refuses a balance that cannot cover the fee, without sending', async () => {
			await expect(
				call({ token: nativeSol, balance: SOLANA_TRANSACTION_FEE_IN_LAMPORTS })
			).rejects.toThrow('does not cover the network fee');

			expect(sendSol).not.toHaveBeenCalled();
		});
	});

	describe('SPL', () => {
		it('sends the full token balance, since the fee is paid in SOL', async () => {
			await call({ token: splToken, balance: 5_000_000n });

			expect(sendSol).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ token: splToken, amount: 5_000_000n })
			);
		});

		it('refuses when the account holds no SOL for the fee, without sending', async () => {
			await expect(
				call({ token: splToken, balance: 5_000_000n, nativeBalance: ZERO })
			).rejects.toThrow('Not enough SOL');

			expect(sendSol).not.toHaveBeenCalled();
		});
	});
});
