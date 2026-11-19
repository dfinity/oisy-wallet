import { isTopUpRefundMemo } from '$icp/utils/cycles-ledger.utils';

describe('cycles-ledger.utils', () => {
	describe('isTopUpRefundMemo', () => {
		it('should accept the 32 bytes of 0xff the ledger refunds a top-up with', () => {
			expect(isTopUpRefundMemo(new Uint8Array(32).fill(0xff))).toBeTruthy();
		});

		it.each([
			{ name: 'no memo', memo: undefined },
			{ name: 'a shorter memo', memo: new Uint8Array(31).fill(0xff) },
			{ name: 'a longer memo', memo: new Uint8Array(33).fill(0xff) },
			{ name: 'another byte', memo: new Uint8Array(32).fill(0xff).fill(0xfd, 31) }
		])('should reject $name', ({ memo }) => {
			expect(isTopUpRefundMemo(memo)).toBeFalsy();
		});
	});
});
