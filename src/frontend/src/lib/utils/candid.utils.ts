/**
 * Candid identifies record and variant fields by a hash of their name, and the wire carries only
 * that hash. The generated bindings hide this because they already know every name; a value
 * decoded as `IDL.Unknown` does not, and comes back keyed by the raw hash instead:
 * `{ _400215630_: null }`.
 *
 * So a frontend that decodes tolerantly has to hash the names it knows to recognise what it got.
 */

const CANDID_HASH_MULTIPLIER = 223;
const CANDID_HASH_MODULUS = 2 ** 32;

const HASHED_KEY_PATTERN = /^_(\d+)_$/;

/**
 * Candid's field-name hash: `h = h * 223 + byte`, over the UTF-8 bytes, mod 2^32.
 *
 * The intermediate stays below 2^53, so plain numbers are exact here.
 */
export const candidFieldHash = (name: string): number =>
	Array.from(new TextEncoder().encode(name)).reduce(
		(acc, byte) => (acc * CANDID_HASH_MULTIPLIER + byte) % CANDID_HASH_MODULUS,
		0
	);

/**
 * Resolves a variant key decoded as `IDL.Unknown` back to the name it stands for.
 *
 * Returns `undefined` when no known name hashes to it — which is precisely the case we decode
 * tolerantly for: a variant the backend knows and this frontend does not.
 */
export const resolveCandidVariantKey = <T extends string>({
	key,
	names
}: {
	key: object;
	names: readonly T[];
}): T | undefined => {
	const [rawKey] = Object.keys(key);

	if (rawKey === undefined) {
		return undefined;
	}

	// A name we already know survives as-is; only unknown ones arrive hashed.
	if ((names as readonly string[]).includes(rawKey)) {
		return rawKey as T;
	}

	const hash = rawKey.match(HASHED_KEY_PATTERN)?.[1];

	if (hash === undefined) {
		return undefined;
	}

	return names.find((name) => `${candidFieldHash(name)}` === hash);
};

/**
 * The raw hash a tolerantly decoded key carries, for reporting a name we cannot resolve.
 */
export const candidVariantKeyLabel = (key: object): string => Object.keys(key).join(', ');
