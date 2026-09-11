import {
	invalidXrpAddress,
	isXrpAddress,
	mapEd25519PublicKeyToClassicAddress
} from '$xrp/utils/xrp-address.utils';

describe('xrp-address.utils', () => {
	// Authoritative Ed25519 vector from XRPLF/xrpl.js ripple-keypairs fixtures:
	// canonical public key ED01FA53…37A63 → classic address rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD.
	const CANONICAL_PUBLIC_KEY_HEX =
		'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';
	// The raw 32-byte Ed25519 key our derivation produces is the canonical key without its 0xED prefix.
	const RAW_PUBLIC_KEY = Uint8Array.from(Buffer.from(CANONICAL_PUBLIC_KEY_HEX.slice(2), 'hex'));
	const EXPECTED_ADDRESS = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';

	describe('mapEd25519PublicKeyToClassicAddress', () => {
		it('derives the correct classic address from a raw Ed25519 public key', () => {
			expect(mapEd25519PublicKeyToClassicAddress(RAW_PUBLIC_KEY)).toBe(EXPECTED_ADDRESS);
		});

		it('produces a valid XRPL classic address', () => {
			expect(isXrpAddress(mapEd25519PublicKeyToClassicAddress(RAW_PUBLIC_KEY))).toBeTruthy();
		});
	});

	describe('isXrpAddress', () => {
		it('accepts a valid classic address', () => {
			expect(isXrpAddress(EXPECTED_ADDRESS)).toBeTruthy();
		});

		it('rejects a malformed address', () => {
			expect(isXrpAddress('not-an-address')).toBeFalsy();
		});

		it('rejects an address with an invalid checksum', () => {
			expect(isXrpAddress('rLUEXYuLiQptky37CqLcm9USQpPiz5rkpX')).toBeFalsy();
		});

		it('rejects a non-XRPL (e.g. Ethereum) address', () => {
			expect(isXrpAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBeFalsy();
		});

		it('rejects nullish input', () => {
			expect(isXrpAddress(undefined)).toBeFalsy();
		});
	});

	describe('invalidXrpAddress', () => {
		it('is the negation of isXrpAddress', () => {
			expect(invalidXrpAddress(EXPECTED_ADDRESS)).toBeFalsy();
			expect(invalidXrpAddress('not-an-address')).toBeTruthy();
			expect(invalidXrpAddress(undefined)).toBeTruthy();
		});
	});
});
