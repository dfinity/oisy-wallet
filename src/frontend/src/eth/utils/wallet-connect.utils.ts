import type { WalletConnectEthSignTypedDataV4 } from '$eth/types/wallet-connect';
import { isEthAddress } from '$eth/utils/account.utils';
import { ZERO } from '$lib/constants/app.constants';
import { CONTEXT_VALIDATION_ISSCAM } from '$lib/constants/wallet-connect.constants';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Verify } from '@walletconnect/types';
import { TypedDataEncoder, type TypedDataField } from 'ethers/hash';
import { isHexString, toUtf8String } from 'ethers/utils';

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
 * Thrown when an `eth_signTypedData_v4` request carries a value whose runtime
 * JSON type does not match the type declared in its EIP-712 schema.
 *
 * `ethers` does not type-check EIP-712 values before hashing and coerces
 * mismatched values instead of rejecting them — its `bool` encoder, for
 * instance, treats any truthy value (including a non-empty string) as `true`.
 * We reject such payloads so OISY only signs typed data that conforms to its
 * declared schema.
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
	const signed = !type.startsWith('u');

	let parsed: bigint;
	if (typeof value === 'bigint') {
		parsed = value;
	} else if (typeof value === 'number' && Number.isInteger(value)) {
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

export const getSignParamsMessageTypedDataV4Hash = (params: string[]): string => {
	const { domain, types, message } = getSignParamsMessageTypedDataV4(params);
	const { EIP712Domain: _, ...rest } = types;

	// Reject type-invalid payloads before hashing so we only sign typed data
	// that conforms to its declared schema.
	assertValidEthTypedData({
		types: rest,
		primaryType: TypedDataEncoder.getPrimaryType(rest),
		message
	});

	return TypedDataEncoder.hash(domain, { ...rest }, message);
};

/**
 * Whether the params describe an `eth_signTypedData_v4` request that carries a
 * type-invalid EIP-712 value (e.g. a bool declared as `bool` but sent as the
 * string `"false"`). Used by the confirmation UI to warn and to disable signing,
 * so the preview and the signer enforce the exact same validation.
 *
 * Returns `false` for valid typed data and for non-typed-data messages (e.g.
 * `personal_sign`), which are not signed through the typed-data path.
 */
export const hasInvalidTypedDataParams = (params: string[]): boolean => {
	try {
		getSignParamsMessageTypedDataV4Hash(params);
		return false;
	} catch (err: unknown) {
		return err instanceof WalletConnectEthTypedDataError;
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
