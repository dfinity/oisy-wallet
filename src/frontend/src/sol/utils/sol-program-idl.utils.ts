import {
	ANCHOR_IDL_ACCOUNT_DISCRIMINATOR,
	ANCHOR_IDL_ACCOUNT_HEADER_LENGTH,
	ANCHOR_IDL_ACCOUNT_LENGTH_OFFSET,
	ANCHOR_IDL_SEED
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	createAddressWithSeed,
	getProgramDerivedAddress,
	address as solAddress
} from '@solana/kit';

/**
 * Where a program publishes its own interface, if it publishes one.
 *
 * Anchor writes the IDL to an account derived from the program itself, so the address is arrived at
 * rather than looked up: seedless PDA of the program, then that as the base of a seeded address
 * owned by the program. Nothing here asks the network anything.
 */
export const findSolProgramIdlAddress = async ({
	programAddress
}: {
	programAddress: SolAddress;
}): Promise<SolAddress> => {
	const [baseAddress] = await getProgramDerivedAddress({
		programAddress: solAddress(programAddress),
		seeds: []
	});

	return await createAddressWithSeed({
		baseAddress,
		programAddress: solAddress(programAddress),
		seed: ANCHOR_IDL_SEED
	});
};

const inflate = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => {
	const stream = new ReadableStream<BufferSource>({
		start: (controller) => {
			controller.enqueue(bytes);
			controller.close();
		}
	}).pipeThrough(new DecompressionStream('deflate'));

	const reader = stream.getReader();

	const chunks: Uint8Array[] = [];

	let result = await reader.read();

	while (!result.done) {
		chunks.push(result.value);

		result = await reader.read();
	}

	const inflated = chunks.reduce<Uint8Array>((acc, chunk) => {
		const merged = new Uint8Array(acc.length + chunk.length);
		merged.set(acc);
		merged.set(chunk, acc.length);

		return merged;
	}, new Uint8Array());

	return new TextDecoder().decode(inflated);
};

const isIdlAccount = (data: Uint8Array<ArrayBuffer>): boolean =>
	data.length >= ANCHOR_IDL_ACCOUNT_HEADER_LENGTH &&
	ANCHOR_IDL_ACCOUNT_DISCRIMINATOR.every((byte, index) => data[index] === byte);

/**
 * The name a program gives itself, out of the IDL account's own bytes.
 *
 * The layout is Anchor's: a fixed discriminator, the authority allowed to rewrite it, the length of
 * what follows, then the IDL as zlib-compressed JSON. Anchor moved the name into `metadata` at
 * 0.30, so both places are read.
 *
 * The name is the program's own claim about itself, signed by nothing: the IDL's authority writes
 * whatever it likes there, and a hostile program can call its drain instruction anything. It is a
 * label for an instruction the review already refuses to state, never a reason to state one.
 *
 * Returns `undefined` for an account that is not an IDL, does not inflate, or is not JSON. All
 * three mean the same thing to the caller: this program does not say what it is.
 */
export const decodeSolProgramIdlName = async (
	data: Uint8Array<ArrayBuffer>
): Promise<string | undefined> => {
	if (!isIdlAccount(data)) {
		return undefined;
	}

	const length = new DataView(data.buffer, data.byteOffset).getUint32(
		ANCHOR_IDL_ACCOUNT_LENGTH_OFFSET,
		true
	);

	if (length === 0 || data.length < ANCHOR_IDL_ACCOUNT_HEADER_LENGTH + length) {
		return undefined;
	}

	try {
		const idl: unknown = JSON.parse(
			await inflate(
				data.subarray(ANCHOR_IDL_ACCOUNT_HEADER_LENGTH, ANCHOR_IDL_ACCOUNT_HEADER_LENGTH + length)
			)
		);

		if (isNullish(idl) || typeof idl !== 'object') {
			return undefined;
		}

		const metadata = 'metadata' in idl ? idl.metadata : undefined;

		const name =
			nonNullish(metadata) && typeof metadata === 'object' && 'name' in metadata
				? metadata.name
				: 'name' in idl
					? idl.name
					: undefined;

		return typeof name === 'string' && name.length > 0 ? name : undefined;
	} catch (_: unknown) {
		return undefined;
	}
};
