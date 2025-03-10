import {
	LOCAL_CKBTC_LEDGER_CANISTER_ID,
	LOCAL_CKETH_LEDGER_CANISTER_ID,
	LOCAL_CKUSDC_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { IcCkToken } from '$icp/types/ic-token';
import * as assertAmountUtils from '$lib/utils/assert-amount.utils';
import { validateUserAmount } from '$lib/utils/user-amount.utils';
import { mockCkBtcMinterInfo as mockCkBtcMinterInfoData } from '$tests/mocks/ckbtc.mock';
import { createMockErc20Tokens } from '$tests/mocks/erc20-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import type { MinterInfo as CkEthMinterInfo } from '@dfinity/cketh/dist/candid/minter';
import { BigNumber } from 'alchemy-sdk';
import { vi, type MockInstance } from 'vitest';

describe('validateUserAmount', () => {
	const userAmount = BigNumber.from(200000n);
	const balance = BigNumber.from(9000000n);
	const fee = 10000n;
	const mockCkEthMinterInfo = {
		data: { minimum_withdrawal_amount: [500n] } as CkEthMinterInfo,
		certified: true
	};
	const mockCkBtcMinterInfo = {
		data: mockCkBtcMinterInfoData,
		certified: true
	};

	let assertErc20AmountSpy: MockInstance;
	let assertCkErc20AmountSpy: MockInstance;
	let assertCkEthAmountSpy: MockInstance;
	let assertCkBtcAmountSpy: MockInstance;
	let assertAmountSpy: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();

		assertErc20AmountSpy = vi.spyOn(assertAmountUtils, 'assertErc20Amount');
		assertCkErc20AmountSpy = vi.spyOn(assertAmountUtils, 'assertCkErc20Amount');
		assertCkEthAmountSpy = vi.spyOn(assertAmountUtils, 'assertCkEthAmount');
		assertCkBtcAmountSpy = vi.spyOn(assertAmountUtils, 'assertCkBtcAmount');
		assertAmountSpy = vi.spyOn(assertAmountUtils, 'assertAmount');
	});

	it('should call assertErc20Amount if token is erc20', () => {
		validateUserAmount({
			userAmount,
			token: createMockErc20Tokens({ n: 1, networkEnv: 'testnet' })[0],
			balance,
			balanceForFee: balance,
			fee
		});

		expect(assertErc20AmountSpy).toHaveBeenCalledOnce();
		expect(assertErc20AmountSpy).toBeCalledWith({
			userAmount,
			balance,
			balanceForFee: balance,
			fee
		});
	});

	it('should call mockedAssertCkErc20Amount if token is ckErc20', () => {
		validateUserAmount({
			userAmount,
			token: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKUSDC_LEDGER_CANISTER_ID
			} as IcCkToken,
			balance,
			balanceForFee: balance,
			fee,
			ethereumEstimateFee: fee
		});

		expect(assertCkErc20AmountSpy).toHaveBeenCalledOnce();
		expect(assertCkErc20AmountSpy).toBeCalledWith({
			userAmount,
			balance,
			balanceForFee: balance,
			fee,
			ethereumEstimateFee: fee
		});
	});

	it('should call assertCkEthAmountSpy if token is ckETH', () => {
		validateUserAmount({
			userAmount,
			token: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKETH_LEDGER_CANISTER_ID
			} as IcCkToken,
			balance,
			fee,
			minterInfo: mockCkEthMinterInfo
		});

		expect(assertCkEthAmountSpy).toHaveBeenCalledOnce();
		expect(assertCkEthAmountSpy).toBeCalledWith({
			userAmount,
			balance,
			fee,
			minterInfo: mockCkEthMinterInfo
		});
	});

	it('should call assertCkBtcAmountSpy if token is ckETH', () => {
		validateUserAmount({
			userAmount,
			token: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKBTC_LEDGER_CANISTER_ID
			} as IcCkToken,
			balance,
			fee,
			minterInfo: mockCkBtcMinterInfo
		});

		expect(assertCkBtcAmountSpy).toHaveBeenCalledOnce();
		expect(assertCkBtcAmountSpy).toBeCalledWith({
			userAmount,
			balance,
			fee,
			minterInfo: mockCkBtcMinterInfo
		});
	});

	it('should call assertAmount if token is ETH', () => {
		validateUserAmount({
			userAmount,
			token: ETHEREUM_TOKEN,
			balance,
			fee
		});

		expect(assertAmountSpy).toHaveBeenCalledOnce();
		expect(assertAmountSpy).toBeCalledWith({
			userAmount,
			balance,
			fee
		});
	});

	it('should call assertAmount if token is BTC', () => {
		validateUserAmount({
			userAmount,
			token: BTC_MAINNET_TOKEN,
			balance,
			fee
		});

		expect(assertAmountSpy).toHaveBeenCalledOnce();
		expect(assertAmountSpy).toBeCalledWith({
			userAmount,
			balance,
			fee
		});
	});

	it('should call assertAmount if it is called from the swap flow', () => {
		validateUserAmount({
			userAmount,
			token: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKBTC_LEDGER_CANISTER_ID
			} as IcCkToken,
			balance,
			fee,
			isSwapFlow: true
		});

		expect(assertAmountSpy).toHaveBeenCalledOnce();
		expect(assertAmountSpy).toBeCalledWith({
			userAmount,
			balance,
			fee
		});
	});
});
