import { getMobileAuthCallbackUrl } from '$lib/utils/mobile-auth-callback.utils';

describe('legacy mobile callback relay', () => {
	it('preserves the signer fragment without decoding plus signs or percent escapes', () => {
		const fragment = '#message=%7B%22signature%22%3A%22A%2BB%2FC%3D%22%7D&state=abc123';

		expect(getMobileAuthCallbackUrl(fragment)).toBe(`oisy://auth-callback${fragment}`);
	});

	it('never takes a destination from callback contents', () => {
		expect(getMobileAuthCallbackUrl('#callback=https://other.example&state=1')).toBe(
			'oisy://auth-callback#callback=https://other.example&state=1'
		);
	});

	it.each(['', '#', 'https://other.example', 'javascript:alert(1)'])(
		'rejects a missing fragment: %s',
		(hash) => {
			expect(getMobileAuthCallbackUrl(hash)).toBeUndefined();
		}
	);

	it('enforces the native callback byte limit', () => {
		expect(getMobileAuthCallbackUrl(`#${'a'.repeat(65_536)}`)).toBeDefined();
		expect(getMobileAuthCallbackUrl(`#${'a'.repeat(65_537)}`)).toBeUndefined();
		expect(getMobileAuthCallbackUrl(`#${'é'.repeat(32_769)}`)).toBeUndefined();
	});
});
