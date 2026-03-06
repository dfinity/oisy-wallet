import type { IcToken } from '$icp/types/ic-token';
import type { IcFeeResult } from '$icp/types/pay';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkOpenCryptoPay } from '$lib/types/network';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	ValidatedIcPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { PrincipalText } from '@dfinity/zod-schemas';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

export const isIcPayableToken = (token: Token): token is IcToken =>
	isTokenIcp(token) || isTokenIcrc(token);

const isIcFeeResult = (fee: PayableTokenWithFees['fee']): fee is IcFeeResult =>
	nonNullish(fee) && 'feePerTransaction' in fee && 'totalFee' in fee;

export const validateIcTransfer = ({
	decodedData,
	amount,
	token
}: {
	decodedData: DecodedUrn;
	token: PayableTokenWithConvertedAmount;
	amount: bigint;
}): ValidatedIcPaymentData => {
	const { destination, amount: amountParam } = decodedData;

	const {
		pay: {
			error: { data_is_incompleted, amount_does_not_match }
		}
	} = get(i18n);

	if (!isIcPayableToken(token) || isNullish(destination) || isNullish(amountParam)) {
		throw new Error(data_is_incompleted);
	}

	const { fee } = token;

	if (!isIcFeeResult(fee)) {
		throw new Error(data_is_incompleted);
	}

	const parseDestination = (destination: string): Principal => {
		try {
			return Principal.fromText(destination);
		} catch {
			throw new Error(data_is_incompleted);
		}
	};

	const spender = parseDestination(destination);

	const dfxAmount = parseToken({
		value: amountParam.toString(),
		unitName: token.decimals
	});

	if (amount !== dfxAmount) {
		throw new Error(amount_does_not_match);
	}

	return {
		spender,
		amount,
		ledgerCanisterId: token.ledgerCanisterId,
		fee
	};
};

export const getIcPaymentUri = ({
	callback,
	quoteId,
	network,
	asset,
	sender
}: {
	callback: string;
	quoteId: string;
	network: NetworkOpenCryptoPay;
	asset: string;
	sender: PrincipalText;
}): string => {
	const apiUrl = callback.replace('cb', 'tx');

	return `${apiUrl}?quote=${quoteId}&method=${network}&asset=${asset}&sender=${sender}`;
};
