import { getAddTokenDataIdentifier } from '$icp-eth/utils/add-token.utils';

describe('add-token.utils', () => {
	describe('getAddTokenDataIdentifier', () => {
		it('should return the identifier the network takes', () => {
			expect(getAddTokenDataIdentifier({ ledgerCanisterId: 'ledger' })).toBe('ledger');
			expect(getAddTokenDataIdentifier({ ethContractAddress: '0xabc' })).toBe('0xabc');
			expect(getAddTokenDataIdentifier({ splTokenAddress: 'mint' })).toBe('mint');
			expect(getAddTokenDataIdentifier({ extCanisterId: 'ext' })).toBe('ext');
			expect(getAddTokenDataIdentifier({ dip721CanisterId: 'dip721' })).toBe('dip721');
			expect(getAddTokenDataIdentifier({ icPunksCanisterId: 'punks' })).toBe('punks');
			expect(getAddTokenDataIdentifier({ icrc7CanisterId: 'icrc7' })).toBe('icrc7');
		});

		it('should return undefined when nothing was entered', () => {
			expect(getAddTokenDataIdentifier({})).toBeUndefined();
		});
	});
});
