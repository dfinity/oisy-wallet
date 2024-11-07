import * as NetworksModule from '$env/networks.icrc.env';
import { IC_CKBTC_LEDGER_CANISTER_ID, IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import { LINK_TOKEN } from '$env/tokens-erc20/tokens.link.env';
import { USDC_TOKEN } from '$env/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens-erc20/tokens.usdt.env';
import { ckErc20Production } from '$env/tokens.ckerc20.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { IcCkToken } from '$icp/types/ic';
import type { TokenStandard, TokenUi } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	calculateTokenUsdBalance,
	getMaxTransactionAmount,
	mapDefaultTokenToToggleable,
	mapTokenUi,
	sumTokenBalances,
	sumUsdBalances
} from '$lib/utils/token.utils';
import { $balances, bn1, bn2, bn3 } from '$tests/mocks/balances.mock';
import { $exchanges } from '$tests/mocks/exchanges.mock';
import { BigNumber } from 'alchemy-sdk';
import { describe, type MockedFunction } from 'vitest';

const tokenDecimals = 8;
const tokenStandards: TokenStandard[] = ['ethereum', 'icp', 'icrc', 'bitcoin'];

const balance = 1000000000n;
const fee = 10000000n;

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

describe('getMaxTransactionAmount', () => {
	it('should return the correct maximum amount for a transaction for each token standard', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				balance: BigNumber.from(balance),
				fee: BigNumber.from(fee),
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(Number(balance - fee) / 10 ** tokenDecimals);
		});
	});

	it('should return 0 if balance is less than fee', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				fee: BigNumber.from(balance),
				balance: BigNumber.from(fee),
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);
		});
	});

	it('should return 0 if balance and fee are undefined', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				balance: undefined,
				fee: undefined,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);
		});
	});

	it('should handle balance or fee being undefined', () => {
		tokenStandards.forEach((tokenStandard) => {
			let result = getMaxTransactionAmount({
				balance: undefined,
				fee: BigNumber.from(fee),
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);

			result = getMaxTransactionAmount({
				balance: BigNumber.from(balance),
				fee: undefined,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
		});
	});

	it('should return the untouched amount if the token is ERC20', () => {
		const result = getMaxTransactionAmount({
			balance: BigNumber.from(balance),
			fee: BigNumber.from(fee),
			tokenDecimals: tokenDecimals,
			tokenStandard: 'erc20'
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});
});

describe('calculateTokenUsdBalance', () => {
	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsdValue.mockImplementation(
			({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
		);
	});

	it('should correctly calculate USD balance for the token', () => {
		const result = calculateTokenUsdBalance({ token: ETHEREUM_TOKEN, $balances, $exchanges });
		expect(result).toEqual(bn3.toNumber());
	});

	it('should return undefined if exchange rate is not available', () => {
		const result = calculateTokenUsdBalance({ token: ICP_TOKEN, $balances, $exchanges: {} });
		expect(result).toEqual(undefined);
	});

	it('should return 0 if balances store is not available', () => {
		const result = calculateTokenUsdBalance({ token: ETHEREUM_TOKEN, $balances: {}, $exchanges });
		expect(result).toEqual(0);
	});

	it('should return 0 if balances store is undefined', () => {
		const result = calculateTokenUsdBalance({
			token: ETHEREUM_TOKEN,
			$balances: undefined,
			$exchanges
		});
		expect(result).toEqual(0);
	});
});

describe('mapTokenUi', () => {
	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsdValue.mockImplementation(
			({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
		);
	});

	it('should return an object TokenUi with the correct values', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances, $exchanges });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: bn3.toNumber()
		});
	});

	it('should return an object TokenUi with undefined usdBalance if exchange rate is not available', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances, $exchanges: {} });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: undefined
		});
	});

	it('should return an object TokenUi with undefined balance if balances store is not initiated', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances: undefined, $exchanges });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: undefined,
			usdBalance: 0
		});
	});

	it('should return an object TokenUi with undefined balance if balances store is not available', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances: {}, $exchanges });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: undefined,
			usdBalance: 0
		});
	});

	it('should return an object TokenUi with null balance if balances data is null', () => {
		const result = mapTokenUi({
			token: ETHEREUM_TOKEN,
			$balances: { [ETHEREUM_TOKEN.id]: null },
			$exchanges
		});
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: null,
			usdBalance: 0
		});
	});
});

describe('sumTokenBalances', () => {
	// We mock ETH to be a twin of ICP
	const token1: TokenUi = { ...ICP_TOKEN, balance: bn1, decimals: 18 };
	const token2: TokenUi = { ...ETHEREUM_TOKEN, balance: bn2, decimals: 18 };

	it('should sum token balances when both balances are non-null and decimals match', () => {
		const result = sumTokenBalances([token1, token2]);

		expect(result).toStrictEqual(bn1.add(bn2));
	});

	it('should return null when decimals do not match', () => {
		expect(sumTokenBalances([token1, { ...token2, decimals: 8 }])).toBeNull();
	});

	it('should return the first balance when the second balance is nullish', () => {
		expect(sumTokenBalances([token1, { ...token2, balance: null }])).toBe(bn1);
	});

	it('should return the second balance when the first balance is nullish', () => {
		expect(sumTokenBalances([{ ...token1, balance: null }, token2])).toBe(bn2);
	});

	it('should return the first balance nullish value when both balances are nullish but not undefined', () => {
		expect(
			sumTokenBalances([
				{ ...token1, balance: null },
				{ ...token2, balance: null }
			])
		).toBeNull();
	});

	it('should return undefined when one of the balances is undefined', () => {
		expect(sumTokenBalances([token1, { ...token2, balance: undefined }])).toBeUndefined();

		expect(sumTokenBalances([{ ...token1, balance: undefined }, token2])).toBeUndefined();
	});

	it('should return undefined when both balances are undefined', () => {
		expect(
			sumTokenBalances([
				{ ...token1, balance: undefined },
				{ ...token2, balance: undefined }
			])
		).toBeUndefined();
	});
});

describe('sumUsdBalances', () => {
	it('should sum token balances when both balances are non-null', () => {
		const result = sumUsdBalances([100, 200]);

		expect(result).toEqual(300);
	});

	it('should return the first balance when the second balance is nullish', () => {
		expect(sumUsdBalances([100, undefined])).toBe(100);
	});

	it('should return the second balance when the first balance is nullish', () => {
		expect(sumUsdBalances([undefined, 200])).toBe(200);
	});

	it('should return undefined when both balances are nullish', () => {
		expect(sumUsdBalances([undefined, undefined])).toBeUndefined();
	});
});

describe('mapDefaultTokenToToggleable', () => {
	describe('Every other random token is only enabled if the user enables it', () => {
		it('should enable LINK if user enables it', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: LINK_TOKEN,
				userToken: { ...LINK_TOKEN, enabled: true }
			});

			expect(result.enabled).toEqual(true);
		});

		it('should not enable LINK if user has not enabled it', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: LINK_TOKEN,
				userToken: { ...LINK_TOKEN, enabled: false }
			});

			expect(result.enabled).toEqual(false);
		});

		it('should not enable LINK if userToken is undefined', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: LINK_TOKEN,
				userToken: undefined
			});

			expect(result.enabled).toEqual(false);
		});
	});

	describe('Default ICRC tokens are always enabled', () => {
		describe('ckBTC', () => {
			const dummyCkBTC = { ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID } as IcCkToken;
			it('should enable ckBTC if no userToken', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkBTC,
					userToken: undefined
				});

				expect(result.enabled).toEqual(true);
			});

			it('should enable ckBTC if userToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkBTC,
					userToken: { ...dummyCkBTC, enabled: false }
				});

				expect(result.enabled).toEqual(true);
			});

			it('should enable ckBTC if userToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkBTC,
					userToken: { ...dummyCkBTC, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});
		});

		describe('ckETH', () => {
			const dummyCkETH = { ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID } as IcCkToken;
			it('should enable ckETH if no userToken', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkETH,
					userToken: undefined
				});

				expect(result.enabled).toEqual(true);
			});

			it('should enable ckETH if userToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkETH,
					userToken: { ...dummyCkETH, enabled: false }
				});

				expect(result.enabled).toEqual(true);
			});

			it('should enable ckETH if userToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkETH,
					userToken: { ...dummyCkETH, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});
		});

		describe('ckUSDC', () => {
			const ckUSDCLedgerCanisterId = ckErc20Production.ckUSDC?.ledgerCanisterId;

			beforeEach(() => {
				vi.spyOn(
					NetworksModule,
					'ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS',
					'get'
				).mockReturnValue([ckUSDCLedgerCanisterId ?? '']);
			});

			const dummyCkUSDC = { ledgerCanisterId: ckUSDCLedgerCanisterId } as IcCkToken;

			it('should enable ckUSDC if no userToken', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkUSDC,
					userToken: undefined
				});

				expect(result.enabled).toEqual(true);
			});

			it('should enable ckUSDC if userToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkUSDC,
					userToken: { ...dummyCkUSDC, enabled: false }
				});

				expect(result.enabled).toEqual(true);
			});

			it('should enable ckUSDC if userToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkUSDC,
					userToken: { ...dummyCkUSDC, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});
		});
	});

	describe('Suggested ICRC tokens are enabled if user has no settings', () => {
		describe('ckUSDT', () => {
			const ckUSDTLedgerCanisterId = ckErc20Production.ckUSDT?.ledgerCanisterId;

			beforeEach(() => {
				vi.spyOn(
					NetworksModule,
					'ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS',
					'get'
				).mockReturnValue([ckUSDTLedgerCanisterId ?? '']);
			});

			const dummyCkUSDT = { ledgerCanisterId: ckUSDTLedgerCanisterId } as IcCkToken;

			it('should enable ckUSDT if no userToken', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkUSDT,
					userToken: undefined
				});

				expect(result.enabled).toEqual(true);
			});

			it('should not enable ckUSDT if userToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkUSDT,
					userToken: { ...dummyCkUSDT, enabled: false }
				});

				expect(result.enabled).toEqual(false);
			});

			it('should enable ckUSDT if userToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: dummyCkUSDT,
					userToken: { ...dummyCkUSDT, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});
		});
	});

	describe('Suggested ERC20 tokens are enabled if user has no settings', () => {
		describe('USDC', () => {
			it('should enable USDC if no userToken', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: USDC_TOKEN,
					userToken: undefined
				});

				expect(result.enabled).toEqual(true);
			});

			it('should not enable USDC if userToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: USDC_TOKEN,
					userToken: { ...USDC_TOKEN, enabled: false }
				});

				expect(result.enabled).toEqual(false);
			});

			it('should enable USDC if userToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: USDC_TOKEN,
					userToken: { ...USDC_TOKEN, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});
		});

		describe('USDT', () => {
			it('should enable USDT if no userToken', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: USDT_TOKEN,
					userToken: undefined
				});

				expect(result.enabled).toEqual(true);
			});

			it('should not enable USDT if userToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: USDT_TOKEN,
					userToken: { ...USDT_TOKEN, enabled: false }
				});

				expect(result.enabled).toEqual(false);
			});

			it('should enable USDT if userToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: USDT_TOKEN,
					userToken: { ...USDT_TOKEN, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});
		});
	});
});
