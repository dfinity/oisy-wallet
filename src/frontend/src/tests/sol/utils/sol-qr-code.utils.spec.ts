import { isBareSolAddressCode } from '$sol/utils/sol-qr-code.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-qr-code.utils', () => {
	describe('isBareSolAddressCode', () => {
		it('returns true for a bare Solana address', () => {
			expect(isBareSolAddressCode(mockSolAddress)).toBeTruthy();
		});

		it('returns true for a Solana address with surrounding whitespace', () => {
			expect(isBareSolAddressCode(`  ${mockSolAddress}  `)).toBeTruthy();
		});

		it('returns false for a Solana address with a solana: URI prefix', () => {
			expect(isBareSolAddressCode(`solana:${mockSolAddress}`)).toBeFalsy();
		});

		it('returns false for a Solana address with query parameters appended', () => {
			expect(isBareSolAddressCode(`${mockSolAddress}?amount=1`)).toBeFalsy();
		});

		it('returns false for an Ethereum address', () => {
			expect(isBareSolAddressCode(mockEthAddress)).toBeFalsy();
		});

		it('returns false for a Bitcoin address', () => {
			expect(isBareSolAddressCode(mockBtcAddress)).toBeFalsy();
		});

		it('returns false for an arbitrary string', () => {
			expect(isBareSolAddressCode('not-an-address')).toBeFalsy();
		});

		it('returns false for an empty string', () => {
			expect(isBareSolAddressCode('')).toBeFalsy();
		});

		it('returns false for a WalletConnect URI', () => {
			expect(isBareSolAddressCode('wc:abcd1234@2?relay-protocol=irn')).toBeFalsy();
		});
	});
});
