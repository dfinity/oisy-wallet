import { EIP155_CHAINS } from '$env/eip155-chains.env';
import { SESSION_REQUEST_ETH_SIGN_TYPED_DATA_METHODS } from '$eth/constants/wallet-connect.constants';
import type {
	WalletConnectEthCall,
	WalletConnectEthSignTypedDataV4,
	WalletConnectEthTypedDataApproval
} from '$eth/types/wallet-connect';
import { isEthAddress } from '$eth/utils/account.utils';
import {
	getCalldataSelector,
	hasCalldata,
	isErc20TransactionApprove,
	isErc20TransactionDecreaseAllowance,
	isErc20TransactionIncreaseAllowance,
	isErc20TransactionTransfer,
	isErcTransactionSetApprovalForAll
} from '$eth/utils/transactions.utils';
import { MAX_UINT_160, MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import { CONTEXT_VALIDATION_ISSCAM } from '$lib/constants/wallet-connect.constants';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Verify } from '@walletconnect/types';
import { TypedDataEncoder, type TypedDataDomain, type TypedDataField } from 'ethers/hash';
import { isHexString, toUtf8String } from 'ethers/utils';

/**
 * The gas limit an `eth_sendTransaction` request asks OISY to sign, as a bigint.
 *
 * `eth_sendTransaction` quotes it as a hex quantity. Returns `undefined` when the request carries
 * no limit, or one that is not a usable quantity, in which case the caller falls back to the gas
 * OISY resolved itself.
 *
 * Both the review and the send path resolve the limit through here, so the maximum fee shown for
 * approval is computed from the very limit that ends up in the signed transaction.
 */
export const getSendParamsGas = (gas: string | undefined): bigint | undefined => {
	if (isNullish(gas)) {
		return;
	}

	try {
		const parsed = BigInt(gas);

		return parsed > ZERO ? parsed : undefined;
	} catch (_err: unknown) {
		// A limit that does not parse says nothing about what the dApp wanted, so it is treated as
		// absent rather than signed as-is.
	}
};

/**
 * What an `eth_sendTransaction` request is, as far as its calldata can be read.
 *
 * The order of the checks does not matter. What matters is the last arm: everything that is not
 * positively recognised is `unknown`, so a selector nobody anticipated is described as a call OISY
 * cannot read rather than as whatever the review happened to render before.
 *
 * That is the inversion. The previous shape asked "is this one of the few calls we know to be
 * dangerous?" and treated a "no" as a plain send, which made every selector that was never
 * considered a hole to be reported and patched one at a time: `setApprovalForAll` was one,
 * `increaseAllowance` the next, and Permit2, `transferFrom` and every router `execute` would each
 * have been another. This shape asks "is this one of the few calls we know how to describe?", so
 * the same unread selector is now surfaced as unread. Recognising one more call improves what the
 * user is told; it is no longer what stands between them and a misleading summary.
 */
export const classifyWalletConnectEthCall = (data: string | undefined): WalletConnectEthCall => {
	if (!hasCalldata(data)) {
		return { type: 'native' };
	}

	if (isErc20TransactionApprove(data)) {
		return { type: 'erc20Approve' };
	}

	if (isErc20TransactionTransfer(data)) {
		return { type: 'erc20Transfer' };
	}

	if (isErcTransactionSetApprovalForAll(data)) {
		return { type: 'setApprovalForAll' };
	}

	if (isErc20TransactionIncreaseAllowance(data)) {
		return { type: 'erc20AllowanceDelta', increase: true };
	}

	if (isErc20TransactionDecreaseAllowance(data)) {
		return { type: 'erc20AllowanceDelta', increase: false };
	}

	return { type: 'unknown', selector: getCalldataSelector(data) };
};

/**
 * Whether a call hands someone else the right to move the user's assets.
 *
 * Such a request authorizes rather than moves, so the review titles it an approval however much
 * native value it carries alongside. An `unknown` call may well be one too, which is precisely why
 * it is not titled a send either.
 */
export const isWalletConnectEthApproval = ({ type }: WalletConnectEthCall): boolean =>
	type === 'erc20Approve' || type === 'setApprovalForAll' || type === 'erc20AllowanceDelta';

export const getSignParamsMessageHex = (params: string[]): string =>
	params.filter((p) => !isEthAddress(p))[0];

export const getSignParamsMessageUtf8 = (params: string[]): string => {
	const message = getSignParamsMessageHex(params);
	return convertHexToUtf8(message);
};

export const getSignParamsMessageTypedDataV4 = (
	params: string[]
): WalletConnectEthSignTypedDataV4 => {
	const message = getSignParamsMessageHex(params);
	return JSON.parse(message);
};

/**
 * Thrown when an `eth_signTypedData_v4` request declares a member whose value
 * does not match the type declared for it.
 *
 * `ethers` does not type-check EIP-712 values before hashing and coerces
 * mismatched values instead of rejecting them — its `bool` encoder, for
 * instance, treats any truthy value (including a non-empty string) as `true`.
 * We reject such payloads so OISY only signs typed data whose declared members
 * hash to what they say.
 *
 * A key the schema does not declare is a different matter and is not an error:
 * see {@link getSignedEthTypedData}.
 */
export class WalletConnectEthTypedDataError extends Error {}

const ARRAY_TYPE_REGEX = /^(.+)\[(\d*)\]$/;
const INTEGER_TYPE_REGEX = /^u?int(\d*)$/;
const FIXED_BYTES_TYPE_REGEX = /^bytes(\d+)$/;
const DYNAMIC_BYTES_REGEX = /^0x([0-9a-fA-F]{2})*$/;
const DECIMAL_INTEGER_REGEX = /^-?\d+$/;
const HEX_INTEGER_REGEX = /^0x[0-9a-fA-F]+$/;

const describeRuntimeType = (value: unknown): string => {
	if (value === null) {
		return 'null';
	}
	if (Array.isArray(value)) {
		return 'array';
	}
	return typeof value;
};

const invalidTypedDataValue = ({
	path,
	type,
	value
}: {
	path: string;
	type: string;
	value: unknown;
}): never => {
	throw new WalletConnectEthTypedDataError(
		`EIP-712 value at "${path}" does not match its declared type "${type}" (received ${describeRuntimeType(value)}).`
	);
};

const assertValidInteger = ({
	value,
	type,
	path
}: {
	value: unknown;
	type: string;
	path: string;
}): void => {
	// `uint`/`int` are aliases for the 256-bit variants: the digits group is
	// empty for them, so fall back to 256 rather than parsing '' as 0.
	const digits = type.match(INTEGER_TYPE_REGEX)?.[1] ?? '';
	const bits = digits === '' ? 256 : Number(digits);

	// Solidity integer types are 8..256 bits in steps of 8. Guard against invalid
	// sizes (e.g. `uint0`) to avoid runtime errors and to match ethers' behavior.
	if (!Number.isInteger(bits) || bits < 8 || bits > 256 || bits % 8 !== 0) {
		return invalidTypedDataValue({ path, type, value });
	}

	const signed = !type.startsWith('u');

	let parsed: bigint;
	if (typeof value === 'bigint') {
		parsed = value;
	} else if (typeof value === 'number' && Number.isSafeInteger(value)) {
		parsed = BigInt(value);
	} else if (
		typeof value === 'string' &&
		(DECIMAL_INTEGER_REGEX.test(value) || HEX_INTEGER_REGEX.test(value))
	) {
		parsed = BigInt(value);
	} else {
		return invalidTypedDataValue({ path, type, value });
	}

	const min = signed ? -(2n ** BigInt(bits - 1)) : ZERO;
	const max = signed ? 2n ** BigInt(bits - 1) - 1n : 2n ** BigInt(bits) - 1n;

	if (parsed < min || parsed > max) {
		invalidTypedDataValue({ path, type, value });
	}
};

const assertValidBytes = ({
	value,
	type,
	path
}: {
	value: unknown;
	type: string;
	path: string;
}): void => {
	if (typeof value !== 'string') {
		return invalidTypedDataValue({ path, type, value });
	}

	const fixedSize = type.match(FIXED_BYTES_TYPE_REGEX)?.[1];
	if (nonNullish(fixedSize)) {
		const size = Number(fixedSize);
		if (size < 1 || size > 32 || !new RegExp(`^0x[0-9a-fA-F]{${size * 2}}$`).test(value)) {
			invalidTypedDataValue({ path, type, value });
		}
		return;
	}

	if (!DYNAMIC_BYTES_REGEX.test(value)) {
		invalidTypedDataValue({ path, type, value });
	}
};

const assertValidTypedDataValue = ({
	types,
	type,
	value,
	path
}: {
	types: Record<string, Array<TypedDataField>>;
	type: string;
	value: unknown;
	path: string;
}): void => {
	const arrayMatch = type.match(ARRAY_TYPE_REGEX);
	if (nonNullish(arrayMatch)) {
		const [, baseType, fixedLength] = arrayMatch;
		if (!Array.isArray(value)) {
			return invalidTypedDataValue({ path, type, value });
		}
		if (fixedLength !== '' && value.length !== Number(fixedLength)) {
			return invalidTypedDataValue({ path, type, value });
		}
		value.forEach((item, index) =>
			assertValidTypedDataValue({ types, type: baseType, value: item, path: `${path}[${index}]` })
		);
		return;
	}

	// Custom struct reference.
	if (type in types) {
		return assertValidTypedDataStruct({ types, type, value, path });
	}

	if (type === 'bool') {
		// Reject any non-boolean: `ethers` would otherwise coerce a truthy value
		// (e.g. a non-empty string) to `true`.
		if (typeof value !== 'boolean') {
			invalidTypedDataValue({ path, type, value });
		}
		return;
	}

	if (type === 'address') {
		if (typeof value !== 'string' || !isEthAddress(value)) {
			invalidTypedDataValue({ path, type, value });
		}
		return;
	}

	if (type === 'string') {
		if (typeof value !== 'string') {
			invalidTypedDataValue({ path, type, value });
		}
		return;
	}

	if (type === 'bytes' || FIXED_BYTES_TYPE_REGEX.test(type)) {
		return assertValidBytes({ value, type, path });
	}

	if (INTEGER_TYPE_REGEX.test(type)) {
		return assertValidInteger({ value, type, path });
	}

	// Unknown type: neither a declared struct nor a recognized atomic type.
	// `ethers` would reject it while hashing, so we reject it here too.
	invalidTypedDataValue({ path, type, value });
};

const assertValidTypedDataStruct = ({
	types,
	type,
	value,
	path
}: {
	types: Record<string, Array<TypedDataField>>;
	type: string;
	value: unknown;
	path: string;
}): void => {
	const fields = types[type];
	if (isNullish(fields) || typeof value !== 'object' || value === null || Array.isArray(value)) {
		return invalidTypedDataValue({ path, type, value });
	}

	const record = value as Record<string, unknown>;

	// Only the declared members are validated. A key the struct does not declare is not part of the
	// digest, so it says nothing about whether the request conforms to its schema; it is dropped
	// from what the user is shown instead. See {@link getSignedEthTypedData}.
	fields.forEach(({ name, type: fieldType }) =>
		assertValidTypedDataValue({
			types,
			type: fieldType,
			value: record[name],
			path: `${path}.${name}`
		})
	);
};

/**
 * Recursively validates that every value in an EIP-712 message matches the type
 * declared for it in the schema — at the top level, inside nested structs, and
 * inside arrays. Throws {@link WalletConnectEthTypedDataError} on the first
 * mismatch. See {@link WalletConnectEthTypedDataError} for why this is required.
 */
export const assertValidEthTypedData = ({
	types,
	primaryType,
	message
}: {
	types: Record<string, Array<TypedDataField>>;
	primaryType: string;
	message: Record<string, unknown>;
}): void =>
	assertValidTypedDataStruct({ types, type: primaryType, value: message, path: primaryType });

interface SignedTypedDataStruct {
	value: Record<string, unknown>;
	dropped: boolean;
}

const toSignedTypedDataValue = ({
	types,
	type,
	value
}: {
	types: Record<string, Array<TypedDataField>>;
	type: string;
	value: unknown;
}): { value: unknown; dropped: boolean } => {
	const arrayMatch = type.match(ARRAY_TYPE_REGEX);
	if (nonNullish(arrayMatch) && Array.isArray(value)) {
		const [, baseType] = arrayMatch;

		const items = value.map((item) =>
			toSignedTypedDataValue({ types, type: baseType, value: item })
		);

		return {
			value: items.map(({ value: item }) => item),
			dropped: items.some(({ dropped }) => dropped)
		};
	}

	if (type in types && nonNullish(value) && typeof value === 'object' && !Array.isArray(value)) {
		return toSignedTypedDataStruct({ types, type, value: value as Record<string, unknown> });
	}

	return { value, dropped: false };
};

const toSignedTypedDataStruct = ({
	types,
	type,
	value
}: {
	types: Record<string, Array<TypedDataField>>;
	type: string;
	value: Record<string, unknown>;
}): SignedTypedDataStruct => {
	const fields = types[type] ?? [];

	const declared = new Set(fields.map(({ name }) => name));

	return fields.reduce<SignedTypedDataStruct>(
		(acc, { name, type: fieldType }) => {
			if (!(name in value)) {
				return acc;
			}

			const { value: signed, dropped } = toSignedTypedDataValue({
				types,
				type: fieldType,
				value: value[name]
			});

			return { value: { ...acc.value, [name]: signed }, dropped: acc.dropped || dropped };
		},
		{ value: {}, dropped: Object.keys(value).some((key) => !declared.has(key)) }
	);
};

/**
 * The typed data an `eth_signTypedData_v4` request actually signs: every member its schema
 * declares and nothing else, together with whether the request carried anything more.
 *
 * EIP-712 hashes the declared members only, so a key the schema does not declare is absent from
 * the digest. `ethers`, like every reference `eth_signTypedData_v4` implementation, ignores such a
 * key rather than rejecting it, and dApps rely on that: Hyperliquid, for one, carries routing
 * fields (`type`, `signatureChainId`) alongside the signed members of every action it asks to be
 * signed, so rejecting the payload locks the user out of the app over data no signature covers.
 *
 * Dropping those keys from the preview is what keeps the request honest instead: the user reads
 * the digest and only the digest, while the request still signs exactly as any other wallet signs
 * it.
 */
export const getSignedEthTypedData = (
	typedData: WalletConnectEthSignTypedDataV4
): { typedData: WalletConnectEthSignTypedDataV4; hasUnsignedKeys: boolean } => {
	const { types, message } = typedData;
	const { EIP712Domain: _EIP712Domain, ...rest } = types;

	try {
		const { value, dropped } = toSignedTypedDataStruct({
			types: rest,
			type: TypedDataEncoder.getPrimaryType(rest),
			value: message
		});

		return { typedData: { ...typedData, message: value }, hasUnsignedKeys: dropped };
	} catch (_err: unknown) {
		// Typed data whose primary type cannot be resolved is rejected for signing anyway, so it is
		// previewed as it came rather than as a projection of a schema that does not hold.
		return { typedData, hasUnsignedKeys: false };
	}
};

interface EthTypedDataApprovalSchema {
	primaryType: string;
	types: Record<string, Array<TypedDataField>>;
	toApproval: (params: {
		message: Record<string, unknown>;
		domain: TypedDataDomain;
	}) => WalletConnectEthTypedDataApproval;
}

const toDeclaredAddress = (value: unknown): string | undefined =>
	typeof value === 'string' ? value : undefined;

const toDeclaredUint = (value: unknown): bigint | undefined =>
	typeof value === 'string' || typeof value === 'number' ? BigInt(value) : undefined;

/**
 * The chain a typed-data domain states, as a number.
 *
 * EIP-712 declares `chainId` as a `uint256`, so a domain may state it as a number, as a decimal
 * string, or as a hex one, and every form hashes to the same digest. Comparing them as text
 * matched only the form OISY happens to write, dropping the token for the rest, and the amount
 * hangs off the token.
 *
 * Returns `undefined` for anything that is not a chain. The value comes from the dApp, and
 * `BigInt` throws on what it cannot read rather than reporting it, so a token is then left
 * unresolved instead of resolved wrongly.
 */
export const toTypedDataDomainChainId = (value: unknown): bigint | undefined => {
	if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
		return;
	}

	try {
		return BigInt(value);
	} catch (_err: unknown) {
		// Not a chain id at all.
	}
};

/**
 * A deadline as a number of seconds, when it is one a date can be built from.
 *
 * ERC-2612 permits routinely say "never expires" with a saturated `uint256`, and that is not a
 * moment in time: turned into a `Number` it becomes a year with seventy digits. Such a deadline is
 * left out rather than rendered, since a nonsense date reads as a real one.
 */
const toExpirationSeconds = (value: unknown): number | undefined => {
	const seconds = toDeclaredUint(value);

	return nonNullish(seconds) && seconds >= ZERO && seconds <= BigInt(Number.MAX_SAFE_INTEGER)
		? Number(seconds)
		: undefined;
};

const toDeclaredStruct = (value: unknown): Record<string, unknown> =>
	nonNullish(value) && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

/**
 * The EIP-712 schemas OISY understands well enough to summarize above the raw
 * message, each paired with the declared members that feed the summary.
 *
 * A schema is matched field by field rather than by the mere presence of a
 * `spender` or `details` key: a struct that is not one of these carries no
 * guarantee that such a key means what an allowance summary would suggest.
 */
const ETH_TYPED_DATA_APPROVAL_SCHEMAS: EthTypedDataApprovalSchema[] = [
	// Uniswap Permit2 `PermitSingle`.
	{
		primaryType: 'PermitSingle',
		types: {
			PermitSingle: [
				{ name: 'details', type: 'PermitDetails' },
				{ name: 'spender', type: 'address' },
				{ name: 'sigDeadline', type: 'uint256' }
			],
			PermitDetails: [
				{ name: 'token', type: 'address' },
				{ name: 'amount', type: 'uint160' },
				{ name: 'expiration', type: 'uint48' },
				{ name: 'nonce', type: 'uint48' }
			]
		},
		// Permit2 names the token it is granting an allowance over, and the contract verifying the
		// signature is Permit2 itself rather than that token, so the domain must not be read here.
		toApproval: ({ message: { spender, details } }) => {
			const { token, amount, expiration } = toDeclaredStruct(details);

			const declaredAmount = toDeclaredUint(amount);

			return {
				spender: toDeclaredAddress(spender),
				token: toDeclaredAddress(token),
				amount: declaredAmount,
				unlimited: declaredAmount === MAX_UINT_160,
				expiration: toExpirationSeconds(expiration)
			};
		}
	},
	// Standard ERC-2612 `Permit`.
	{
		primaryType: 'Permit',
		types: {
			Permit: [
				{ name: 'owner', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'value', type: 'uint256' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'deadline', type: 'uint256' }
			]
		},
		// ERC-2612 names no token, because the permit is verified by the token contract itself. The
		// domain is what the digest is separated by, so `verifyingContract` is covered by the
		// signature exactly as the members of the message are.
		toApproval: ({ message: { spender, value, deadline }, domain: { verifyingContract } }) => {
			const declaredValue = toDeclaredUint(value);

			return {
				spender: toDeclaredAddress(spender),
				token: toDeclaredAddress(verifyingContract),
				amount: declaredValue,
				unlimited: declaredValue === MAX_UINT_256,
				expiration: toExpirationSeconds(deadline)
			};
		}
	},
	// DAI's non-standard `Permit`, whose approval is a bool rather than an amount.
	{
		primaryType: 'Permit',
		types: {
			Permit: [
				{ name: 'holder', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'expiry', type: 'uint256' },
				{ name: 'allowed', type: 'bool' }
			]
		},
		// DAI carries no amount: `allowed` sets the allowance to the largest a `uint256` holds, and
		// clearing it revokes. The bool is the allowance, so it is read as one rather than left as
		// a word in the folded message.
		toApproval: ({ message: { spender, expiry, allowed }, domain: { verifyingContract } }) => ({
			spender: toDeclaredAddress(spender),
			token: toDeclaredAddress(verifyingContract),
			amount: allowed === true ? undefined : ZERO,
			unlimited: allowed === true,
			expiration: toExpirationSeconds(expiry)
		})
	}
];

const sameTypedDataFields = ({
	fields,
	expected
}: {
	fields: Array<TypedDataField>;
	expected: Array<TypedDataField>;
}): boolean =>
	fields.length === expected.length &&
	fields.every(
		({ name, type }, index) => expected[index].name === name && expected[index].type === type
	);

const matchesApprovalSchema = ({
	types,
	schema
}: {
	types: Record<string, Array<TypedDataField>>;
	schema: EthTypedDataApprovalSchema;
}): boolean => {
	const expectedNames = Object.keys(schema.types);

	return (
		Object.keys(types).length === expectedNames.length &&
		expectedNames.every((name) => {
			const fields = types[name];

			return nonNullish(fields) && sameTypedDataFields({ fields, expected: schema.types[name] });
		})
	);
};

/**
 * Derives the approval facts summarized above the raw message of a typed-data
 * request.
 *
 * Returns `undefined` unless the payload matches a recognized approval schema
 * exactly and every value conforms to it. That is what keeps the summary honest:
 * each fact it carries is a declared member of the struct being hashed, so it
 * cannot be steered by a key that the signature does not cover.
 */
export const getEthTypedDataApproval = ({
	domain,
	types,
	message
}: WalletConnectEthSignTypedDataV4): WalletConnectEthTypedDataApproval | undefined => {
	const { EIP712Domain: _EIP712Domain, ...rest } = types;

	const schema = ETH_TYPED_DATA_APPROVAL_SCHEMAS.find((schema) =>
		matchesApprovalSchema({ types: rest, schema })
	);

	if (isNullish(schema)) {
		return;
	}

	try {
		assertValidEthTypedData({ types: rest, primaryType: schema.primaryType, message });

		return schema.toApproval({ message, domain });
	} catch (_err: unknown) {
		// A payload that does not conform to its own schema is not summarized: it
		// is rejected for signing anyway, and any value read from it would be
		// describing something the user cannot sign.
	}
};

/**
 * Asserts that the typed data being hashed belongs to the chain the session was granted for.
 *
 * The domain separator carries the chain, and OISY's Ethereum key carries none: one key signs for
 * every EVM network. So without this the chain a dApp connected under constrains nothing. A session
 * scoped to a testnet could ask for a domain on mainnet, and the digest it got back would be
 * accepted there by a real token — an unlimited permit obtained through a session that was never
 * granted mainnet at all.
 *
 * The envelope chain is required too. Treating an absent or unrecognised one as "nothing to check"
 * would leave the check bypassable by simply omitting it.
 *
 * A domain that states no chain is rejected on the same grounds rather than waved through: such a
 * signature is bound to no network, which makes it valid on all of them.
 */
const assertTypedDataChain = ({
	domain,
	sessionChainId
}: {
	domain: TypedDataDomain;
	sessionChainId: string | undefined;
}): void => {
	const granted = nonNullish(sessionChainId)
		? toTypedDataDomainChainId(EIP155_CHAINS[sessionChainId]?.chainId)
		: undefined;

	if (isNullish(granted)) {
		throw new WalletConnectEthTypedDataError(
			`The session states no chain OISY recognizes ("${sessionChainId ?? 'none'}"), so there is nothing the signed domain can be held to.`
		);
	}

	const signed = toTypedDataDomainChainId(domain.chainId);

	if (isNullish(signed)) {
		throw new WalletConnectEthTypedDataError(
			'The EIP-712 domain states no chain, which would make the signature valid on every one of them.'
		);
	}

	if (signed !== granted) {
		throw new WalletConnectEthTypedDataError(
			`The EIP-712 domain is on chain ${signed}, which this session was not granted: it connected for chain ${granted}.`
		);
	}
};

export const getSignParamsMessageTypedDataV4Hash = ({
	params,
	sessionChainId
}: {
	params: string[];
	sessionChainId: string | undefined;
}): string => {
	const { domain, types, message } = getSignParamsMessageTypedDataV4(params);
	const { EIP712Domain: _, ...rest } = types;

	// Reject type-invalid payloads before hashing so we only sign typed data
	// that conforms to its declared schema.
	assertValidEthTypedData({
		types: rest,
		primaryType: TypedDataEncoder.getPrimaryType(rest),
		message
	});

	// Checked here rather than in the review, so that the gate and the signer cannot disagree:
	// both reach the digest through this function, and neither can produce one without a chain.
	assertTypedDataChain({ domain, sessionChainId });

	return TypedDataEncoder.hash(domain, { ...rest }, message);
};

/**
 * Whether a request carries EIP-712 typed data, i.e. whether its payload is
 * interpreted as typed data rather than as a raw message. This is decided by the
 * method alone, never by the shape of the payload: a `personal_sign` payload
 * that happens to parse as typed data is still only ever a raw message.
 */
export const isEthSignTypedDataMethod = (method: string): boolean =>
	SESSION_REQUEST_ETH_SIGN_TYPED_DATA_METHODS.includes(method);

/**
 * Whether a typed-data request would fail to sign — i.e. its typed data cannot
 * be parsed, validated, and hashed. Used by the confirmation UI to warn and
 * disable approval, so the preview mirrors what the signer would do (which
 * rejects any such typed-data request).
 *
 * Returns `false` for raw-message methods (e.g. `personal_sign`), which are
 * signed differently and stay approvable.
 */
export const hasInvalidTypedData = ({
	method,
	params,
	sessionChainId
}: {
	method: string;
	params: string[];
	sessionChainId: string | undefined;
}): boolean => {
	if (!isEthSignTypedDataMethod(method)) {
		return false;
	}

	try {
		getSignParamsMessageTypedDataV4Hash({ params, sessionChainId });
		return false;
	} catch (_err: unknown) {
		return true;
	}
};

export const convertHexToUtf8 = (value: string): string => {
	if (isHexString(value)) {
		try {
			return toUtf8String(value);
		} catch (err: unknown) {
			// We ignore the issue and display the encoded value for now.
			consoleError(err);
		}
	}

	return value;
};

export const acceptedContext = (context: Verify.Context | undefined): boolean =>
	isNullish(context) || context.verified.validation.toUpperCase() !== CONTEXT_VALIDATION_ISSCAM;
