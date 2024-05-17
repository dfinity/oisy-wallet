import { getMaxTransactionAmount } from '$lib/utils/token.utils';

const tokenDecimals = 8;
const tokenId = Symbol('mock');

const balance = 1000000000n;
const fee = 10000000n;

vi.mock('$eth/utils/eth.utils', () => ({
	isSupportedEthTokenId: vi.fn((id: symbol) => id === tokenId)
}));

vi.mock('$icp/utils/ic.utils', () => ({
	isSupportedIcTokenId: vi.fn((id: symbol) => id === tokenId)
}));

vi.mock('$icp/utils/icrc.utils', () => ({
	isSupportedIcrcTokenId: vi.fn((id: symbol) => id === tokenId)
}));

describe('getMaxTransactionAmount', () => {
	it('should return the correct maximum amount for a transaction', () => {
		const result = getMaxTransactionAmount({
			balance,
			fee,
			tokenDecimals: tokenDecimals,
			tokenId: tokenId
		});
		expect(result).toBe(Number(balance - fee) / 10 ** tokenDecimals);
	});

	it('should return 0 if balance is less than fee', () => {
		const result = getMaxTransactionAmount({
			balance: fee,
			fee: balance,
			tokenDecimals: tokenDecimals,
			tokenId: tokenId
		});
		expect(result).toBe(0);
	});

	it('should return 0 if balance and fee are undefined', () => {
		const result = getMaxTransactionAmount({
			balance: undefined,
			fee: undefined,
			tokenDecimals: tokenDecimals,
			tokenId: tokenId
		});
		expect(result).toBe(0);
	});

	it('should handle balance or fee being undefined', () => {
		let result = getMaxTransactionAmount({
			balance: undefined,
			fee,
			tokenDecimals: tokenDecimals,
			tokenId: tokenId
		});
		expect(result).toBe(0);

		result = getMaxTransactionAmount({
			balance,
			fee: undefined,
			tokenDecimals: tokenDecimals,
			tokenId: tokenId
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});

	it('should return the untouched amount if the token is ERC20', () => {
		const result = getMaxTransactionAmount({
			balance,
			fee,
			tokenDecimals: tokenDecimals,
			tokenId: Symbol('otherMock')
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});
});
