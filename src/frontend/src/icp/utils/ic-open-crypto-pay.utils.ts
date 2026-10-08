import type { IcToken } from '$icp/types/ic-token';
import type { IcFeeResult } from '$icp/types/pay';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { i18n } from '$lib/stores/i18n.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { NetworkOpenCryptoPay } from '$lib/types/network';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	ValidatedIcPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { enrichSingleTokenPayableToken } from '$lib/utils/open-crypto-pay-enrich.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { PrincipalText } from '@dfinity/zod-schemas';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

export const isIcPayableToken = (token: Token): token is IcToken =>
	isTokenIcp(token) || isTokenIcrc(token);

const isIcFeeResult = (fee: PayableTokenWithFees['fee']): fee is IcFeeResult =>
	nonNullish(fee) && 'feePerTransaction' in fee && 'totalFee' in fee;

export const enrichIcPayableToken = ({
	token,
	exchanges,
	balances
}: {
	token: PayableTokenWithFees;
	exchanges: ExchangesData;
	balances: CertifiedStoreData<BalancesData>;
}): PayableTokenWithConvertedAmount | undefined =>
	enrichSingleTokenPayableToken({
		token,
		exchanges,
		balances,
		getFee: (fee) => (isIcFeeResult(fee) ? fee.totalFee : undefined)
	});

/**
 * Validates the decoded URN matches the expected ICP URI format.
 *
 * Format: icp:{canister-id}/transfer?to={principal}&amount={amount}
 * `destination` is the ledger canister ID and `to` is the spender principal.
 * The ledger canister ID is verified against the selected token.
 */
const validateIcUriTransfer = ({
	decodedData,
	token,
	parsePrincipal,
	errorMessages
}: {
	decodedData: DecodedUrn & { functionName: 'transfer'; to: string };
	token: PayableTokenWithConvertedAmount & IcToken;
	parsePrincipal: (value: string) => Principal;
	errorMessages: { token_address_mismatch: string };
}): Principal => {
	const { destination, to } = decodedData;

	if (destination !== token.ledgerCanisterId) {
		throw new Error(errorMessages.token_address_mismatch);
	}

	return parsePrincipal(to);
};

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
			error: { data_is_incompleted, amount_does_not_match, token_address_mismatch }
		}
	} = get(i18n);

	if (!isIcPayableToken(token) || isNullish(destination) || isNullish(amountParam)) {
		throw new Error(data_is_incompleted);
	}

	const { fee } = token;

	if (!isIcFeeResult(fee)) {
		throw new Error(data_is_incompleted);
	}

	const parsePrincipal = (value: string): Principal => {
		try {
			return Principal.fromText(value);
		} catch {
			throw new Error(data_is_incompleted);
		}
	};

	if (decodedData.functionName !== 'transfer' || isNullish(decodedData.to)) {
		throw new Error(data_is_incompleted);
	}

	const spender = validateIcUriTransfer({
		decodedData: decodedData as DecodedUrn & { functionName: 'transfer'; to: string },
		token,
		parsePrincipal,
		errorMessages: { token_address_mismatch }
	});

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
