import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { getErc20FeeData, getEthFeeDataWithProvider } from '$eth/services/fee.services';
import type { Erc20Token } from '$eth/types/erc20';
import { signPlugErc20Transaction, signPlugEthTransaction } from '$lib/api/plug-helper.api';
import { sweepPlugEvmBalance } from '$lib/services/plug-evm.services';
import type { Token } from '$lib/types/token';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

vi.mock('$eth/services/fee.services', () => ({
	getEthFeeDataWithProvider: vi.fn(),
	getErc20FeeData: vi.fn()
}));
vi.mock('$lib/api/plug-helper.api', () => ({
	signPlugEthTransaction: vi.fn(),
	signPlugErc20Transaction: vi.fn()
}));

const MAX_FEE = 30_000_000_000n;
const PRIORITY_FEE = 1_000_000_000n;
const FROM = '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4';
const DESTINATION = '0x58550cb722C3e4177D05a5f34C3B735bD420EbFc';
const SIGNED = '0x02f871...';
const TX_HASH = '0xdeadbeef';

const nativeToken = { ...mockValidToken, symbol: 'ETH', network: ETHEREUM_NETWORK } as Token;

const erc20Token = {
	...mockValidToken,
	standard: { code: 'erc20' },
	symbol: 'USDT',
	network: ETHEREUM_NETWORK,
	address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
} as unknown as Erc20Token;

describe('sweepPlugEvmBalance', () => {
	const sendTransaction = vi.fn();
	const getTransactionCountPending = vi.fn();

	const call = ({
		token,
		balance,
		nativeBalance = 10n ** 18n
	}: {
		token: Token;
		balance: bigint;
		nativeBalance?: bigint;
	}) =>
		sweepPlugEvmBalance({
			identity: mockIdentity,
			token,
			balance,
			nativeBalance,
			destination: DESTINATION,
			from: FROM,
			network: ETHEREUM_NETWORK
		});

	beforeEach(() => {
		vi.clearAllMocks();

		getTransactionCountPending.mockResolvedValue(7);
		sendTransaction.mockResolvedValue({ hash: TX_HASH });

		vi.mocked(getEthFeeDataWithProvider).mockResolvedValue({
			feeData: { maxFeePerGas: MAX_FEE, maxPriorityFeePerGas: PRIORITY_FEE },
			provider: { sendTransaction, getTransactionCountPending },
			params: { from: FROM, to: DESTINATION }
		} as unknown as Awaited<ReturnType<typeof getEthFeeDataWithProvider>>);

		vi.mocked(signPlugEthTransaction).mockResolvedValue(SIGNED);
		vi.mocked(signPlugErc20Transaction).mockResolvedValue(SIGNED);
		vi.mocked(getErc20FeeData).mockResolvedValue(60_000n);
	});

	describe('native', () => {
		it('reserves gas out of the amount sent', async () => {
			const balance = 10n ** 16n;

			await call({ token: nativeToken, balance });

			expect(signPlugEthTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					to: DESTINATION,
					amount: balance - ETH_BASE_FEE * MAX_FEE,
					gasLimit: ETH_BASE_FEE,
					maxFeePerGas: MAX_FEE,
					nonce: 7n,
					chainId: ETHEREUM_NETWORK.chainId
				})
			);
		});

		it('broadcasts the signed transaction and returns its hash', async () => {
			await expect(call({ token: nativeToken, balance: 10n ** 16n })).resolves.toBe(TX_HASH);

			expect(sendTransaction).toHaveBeenCalledExactlyOnceWith(SIGNED);
		});

		it('refuses a balance that cannot cover its own gas, without signing', async () => {
			await expect(call({ token: nativeToken, balance: ETH_BASE_FEE * MAX_FEE })).rejects.toThrow(
				'does not cover the gas'
			);

			expect(signPlugEthTransaction).not.toHaveBeenCalled();
		});

		it('refuses to sign when the network reports no fee ceiling', async () => {
			vi.mocked(getEthFeeDataWithProvider).mockResolvedValue({
				feeData: { maxFeePerGas: null, maxPriorityFeePerGas: PRIORITY_FEE },
				provider: { sendTransaction, getTransactionCountPending },
				params: {}
			} as unknown as Awaited<ReturnType<typeof getEthFeeDataWithProvider>>);

			await expect(call({ token: nativeToken, balance: 10n ** 16n })).rejects.toThrow();

			expect(signPlugEthTransaction).not.toHaveBeenCalled();
		});
	});

	describe('erc20', () => {
		it('sends the full token balance, since gas is paid in the native coin', async () => {
			await call({ token: erc20Token, balance: 5_000_000n });

			expect(signPlugErc20Transaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					amount: 5_000_000n,
					gasLimit: 60_000n,
					contractAddress: erc20Token.address,
					to: DESTINATION,
					nonce: 7n
				})
			);
		});

		it('refuses when the account has no native coin for gas, without signing', async () => {
			await expect(
				call({ token: erc20Token, balance: 5_000_000n, nativeBalance: 1n })
			).rejects.toThrow('Not enough native balance');

			expect(signPlugErc20Transaction).not.toHaveBeenCalled();
		});

		it('never uses the native signing method for a token', async () => {
			await call({ token: erc20Token, balance: 5_000_000n });

			expect(signPlugEthTransaction).not.toHaveBeenCalled();
		});
	});

	describe('erc4626', () => {
		// A vault share is an ERC-20, so it takes the ERC-20 send path on its own
		// contract — never the native path, which would move ETH instead.
		const erc4626Token = {
			...mockValidToken,
			standard: { code: 'erc4626' },
			symbol: 'bAutopilot_USDC',
			network: ETHEREUM_NETWORK,
			address: '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4'
		} as unknown as Token;

		it('transfers vault shares through the ERC-20 signing method', async () => {
			await call({ token: erc4626Token, balance: 5_000_000n });

			expect(signPlugErc20Transaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					amount: 5_000_000n,
					contractAddress: '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4',
					to: DESTINATION
				})
			);
			expect(signPlugEthTransaction).not.toHaveBeenCalled();
		});
	});
});
