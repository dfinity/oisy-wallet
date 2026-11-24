import { ANCHOR_IDL_ACCOUNT_DISCRIMINATOR } from '$sol/constants/sol.constants';
import {
	decodeSolProgramIdlName,
	findSolProgramIdlAddress
} from '$sol/utils/sol-program-idl.utils';
import { deflateSync } from 'node:zlib';

// The addresses below are Anchor's own derivation, checked against the accounts these programs
// actually publish on mainnet.
const JUPITER_PROGRAM_ADDRESS = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
const JUPITER_IDL_ADDRESS = 'C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa';
const WHIRLPOOL_PROGRAM_ADDRESS = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
const WHIRLPOOL_IDL_ADDRESS = '2KFqE4RWoPVbvodo8vbggCFeHPS8TDvgpwp79ALMrcyn';

const idlAccount = ({
	idl,
	discriminator = ANCHOR_IDL_ACCOUNT_DISCRIMINATOR,
	length
}: {
	idl: string;
	discriminator?: number[];
	length?: number;
}): Uint8Array<ArrayBuffer> => {
	const compressed = new Uint8Array(deflateSync(Buffer.from(idl)));

	const data = new Uint8Array(44 + compressed.length);

	data.set(discriminator);
	// The authority occupies bytes 8 to 39 and is not read.
	new DataView(data.buffer).setUint32(40, length ?? compressed.length, true);
	data.set(compressed, 44);

	return data;
};

describe('sol-program-idl.utils', () => {
	describe('findSolProgramIdlAddress', () => {
		beforeAll(() => {
			// The derivation hashes, which the kit refuses outside a secure context.
			vi.stubGlobal('isSecureContext', true);
		});

		afterAll(() => {
			vi.unstubAllGlobals();
		});

		it.each([
			{ programAddress: JUPITER_PROGRAM_ADDRESS, idlAddress: JUPITER_IDL_ADDRESS },
			{ programAddress: WHIRLPOOL_PROGRAM_ADDRESS, idlAddress: WHIRLPOOL_IDL_ADDRESS }
		])(
			'should derive the IDL address of $programAddress',
			async ({ programAddress, idlAddress }) => {
				await expect(findSolProgramIdlAddress({ programAddress })).resolves.toBe(idlAddress);
			}
		);
	});

	describe('decodeSolProgramIdlName', () => {
		it('should read the name an Anchor 0.30 IDL keeps in its metadata', async () => {
			const data = idlAccount({
				idl: JSON.stringify({ metadata: { name: 'jupiter', version: '0.1.0' } })
			});

			await expect(decodeSolProgramIdlName(data)).resolves.toBe('jupiter');
		});

		it('should read the name an older IDL keeps at the top level', async () => {
			const data = idlAccount({ idl: JSON.stringify({ name: 'whirlpool', version: '0.1.0' }) });

			await expect(decodeSolProgramIdlName(data)).resolves.toBe('whirlpool');
		});

		it('should prefer the metadata name when both are present', async () => {
			const data = idlAccount({
				idl: JSON.stringify({ name: 'stale', metadata: { name: 'current' } })
			});

			await expect(decodeSolProgramIdlName(data)).resolves.toBe('current');
		});

		it('should return undefined for an IDL that names nothing', async () => {
			const data = idlAccount({ idl: JSON.stringify({ metadata: { version: '0.1.0' } }) });

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for an empty name', async () => {
			const data = idlAccount({ idl: JSON.stringify({ metadata: { name: '' } }) });

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for a name that is not a string', async () => {
			const data = idlAccount({ idl: JSON.stringify({ metadata: { name: 42 } }) });

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		// The account is whatever address the derivation landed on, so it has to prove it is one.
		it('should return undefined for an account that is not an IDL', async () => {
			const data = idlAccount({
				idl: JSON.stringify({ metadata: { name: 'jupiter' } }),
				discriminator: [1, 2, 3, 4, 5, 6, 7, 8]
			});

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for an account too short to hold a header', async () => {
			await expect(
				decodeSolProgramIdlName(new Uint8Array(ANCHOR_IDL_ACCOUNT_DISCRIMINATOR))
			).resolves.toBeUndefined();
		});

		it('should return undefined when the length runs past the account', async () => {
			const data = idlAccount({
				idl: JSON.stringify({ metadata: { name: 'jupiter' } }),
				length: 10_000
			});

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for a zero length', async () => {
			const data = idlAccount({
				idl: JSON.stringify({ metadata: { name: 'jupiter' } }),
				length: 0
			});

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for bytes that do not inflate', async () => {
			const data = new Uint8Array(64);
			data.set(ANCHOR_IDL_ACCOUNT_DISCRIMINATOR);
			new DataView(data.buffer).setUint32(40, 20, true);

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for an IDL that is not JSON', async () => {
			const data = idlAccount({ idl: 'not json at all' });

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});

		it('should return undefined for an IDL that is not an object', async () => {
			const data = idlAccount({ idl: JSON.stringify('jupiter') });

			await expect(decodeSolProgramIdlName(data)).resolves.toBeUndefined();
		});
	});
});
