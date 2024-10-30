import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { groupTokens } from '$lib/utils/token-group.utils';
import { bn1, bn2, bn3 } from '$tests/mocks/balances.mock';
import { expect } from 'vitest';

describe('groupTokens', () => {
	it('should return an empty array if no tokens are provided', () => {
		expect(groupTokens([]).length).toBe(0);
	});

	it('should create groups of single-element tokens if none of them have a "native token"', () => {
		const tokens = [
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{ ...SEPOLIA_TOKEN, balance: bn2, usdBalance: 200 },
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 }
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(3);

		result.map((group) => {
			expect(group.tokens.length).toBe(1);
		});

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(SEPOLIA_TOKEN.id);
		expect(result[2].id).toBe(BTC_TESTNET_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[1]);
		expect(result[2].nativeToken).toBe(tokens[2]);

		expect(result[0].balance).toBe(bn1);
		expect(result[1].balance).toBe(bn2);
		expect(result[2].balance).toBe(bn3);

		expect(result[0].usdBalance).toBe(100);
		expect(result[1].usdBalance).toBe(200);
		expect(result[2].usdBalance).toBe(300);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[1].tokens[0]).toBe(tokens[1]);
		expect(result[2].tokens[0]).toBe(tokens[2]);
	});

	it('should group tokens with the same "native token" and same decimals', () => {
		// We mock the tokens to have the same "native token"
		const tokens = [
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).toBe(3);
		expect(result[1].tokens.length).toBe(1);

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(BTC_TESTNET_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[2]);

		expect(result[0].balance).toStrictEqual(bn1.add(bn2).add(bn1));
		expect(result[1].balance).toBe(bn3);

		expect(result[0].usdBalance).toBe(100 + 200 + 400);
		expect(result[1].usdBalance).toBe(300);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[0].tokens[1]).toBe(tokens[1]);
		expect(result[0].tokens[2]).toBe(tokens[3]);
	});

	it('should group tokens with the same "native token" but not the ones with different decimals', () => {
		// We mock the tokens to have the same "native token"
		const tokens = [
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals + 1
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(3);

		expect(result[0].tokens.length).toBe(2);
		expect(result[1].tokens.length).toBe(1);
		expect(result[2].tokens.length).toBe(1);

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(BTC_TESTNET_TOKEN.id);
		expect(result[2].id).toBe(BTC_REGTEST_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[2]);
		expect(result[2].nativeToken).toBe(tokens[3]);

		expect(result[0].balance).toStrictEqual(bn1.add(bn2));
		expect(result[1].balance).toBe(bn3);
		expect(result[2].balance).toBe(bn1);

		expect(result[0].usdBalance).toBe(100 + 200);
		expect(result[1].usdBalance).toBe(300);
		expect(result[2].usdBalance).toBe(400);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[0].tokens[1]).toBe(tokens[1]);
	});

	it('should group tokens with the same "native token" respecting the order they arrive in', () => {
		// We mock the tokens to have the same "native token"
		const tokens = [
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).toBe(3);
		expect(result[1].tokens.length).toBe(1);

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(BTC_TESTNET_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[2]);
		expect(result[1].nativeToken).toBe(tokens[1]);

		expect(result[0].balance).toStrictEqual(bn2.add(bn1).add(bn1));
		expect(result[1].balance).toBe(bn3);

		expect(result[0].usdBalance).toBe(100 + 200 + 400);
		expect(result[1].usdBalance).toBe(300);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[0].tokens[1]).toBe(tokens[2]);
		expect(result[0].tokens[2]).toBe(tokens[3]);
	});

	it('should should create single-element group for the token with no "native token" in the list', () => {
		// We mock the tokens to have the same "native token"
		const tokens = [
			{
				...ICP_TOKEN,
				balance: bn1,
				usdBalance: 100,
				twinToken: BTC_MAINNET_TOKEN,
				decimals: BTC_MAINNET_TOKEN.decimals
			},
			{ ...SEPOLIA_TOKEN, balance: bn2, usdBalance: 200 }
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		result.map((group) => {
			expect(group.tokens.length).toBe(1);
		});

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(SEPOLIA_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[1]);

		expect(result[0].balance).toBe(bn1);
		expect(result[1].balance).toBe(bn2);

		expect(result[0].usdBalance).toBe(100);
		expect(result[1].usdBalance).toBe(200);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[1].tokens[0]).toBe(tokens[1]);
	});

	it('should not re-sort the groups even if the total balance of a group would put it in a higher position in the list', () => {
		// We mock the tokens to have the same "native token"
		const tokens = [
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).not.toBe(3);

		expect(result[0].id).not.toBe(ICP_TOKEN.id);

		expect(result[0].nativeToken).not.toBe(tokens[1]);

		expect(result[0].balance).not.toStrictEqual(bn1.add(bn2).add(bn1));
	});
});
