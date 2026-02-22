import type { UtxosFee } from '$btc/types/btc-send';
import { isBtcAddress } from '$btc/utils/btc-address.utils';
import { isBitcoinToken } from '$btc/utils/token.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { i18n } from '$lib/stores/i18n.store';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	ValidatedBtcPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import { formatToken } from '$lib/utils/format.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const enrichBtcPayableToken = ({
	token,
	exchanges,
	balances
}: {
	token: PayableTokenWithFees;
	exchanges: ExchangesData;
	balances: CertifiedStoreData<BalancesData>;
}): PayableTokenWithConvertedAmount | undefined => {
	const utxosFee = token.fee as UtxosFee;

	if (isNullish(utxosFee) || nonNullish(utxosFee.error)) {
		return;
	}

	const exchangeRate = exchanges?.[token.id]?.usd;
	const balance = balances?.[token.id]?.data ?? ZERO;
	if (isNullish(exchangeRate) || isNullish(balance)) {
		return;
	}

	const amountToPay = parseToken({
		value: token.amount,
		unitName: token.decimals
	});

	if (balance < amountToPay + utxosFee.feeSatoshis) {
		return;
	}

	const formattedFee = Number(
		formatToken({
			value: utxosFee.feeSatoshis,
			unitName: token.decimals,
			displayDecimals: token.decimals
		})
	);

	const amountInUSD = Number(token.amount) * exchangeRate;
	const feeInUSD = formattedFee * exchangeRate;

	return {
		...token,
		amountInUSD,
		feeInUSD,
		sumInUSD: amountInUSD + feeInUSD
	};
};

export const validateBtcTransfer = ({
	decodedData,
	amount,
	token
}: {
	decodedData: DecodedUrn;
	token: PayableTokenWithConvertedAmount;
	amount: bigint;
}): ValidatedBtcPaymentData => {
	const btcFee = token.fee as UtxosFee | undefined;
	const { destination, amount: amountParam } = decodedData;

	const {
		pay: {
			error: { data_is_incompleted, amount_does_not_match, recipient_address_is_not_valid }
		}
	} = get(i18n);

	if (
		!isBitcoinToken(token) ||
		isNullish(btcFee) ||
		nonNullish(btcFee.error) ||
		isNullish(destination) ||
		isNullish(amountParam)
	) {
		throw new Error(data_is_incompleted);
	}

	if (!isBtcAddress({ address: destination })) {
		throw new Error(recipient_address_is_not_valid);
	}

	const dfxAmount = parseToken({
		value: amountParam.toString(),
		unitName: token.decimals
	});

	if (amount !== dfxAmount) {
		throw new Error(amount_does_not_match);
	}

	return {
		destination,
		satoshisAmount: amount,
		utxosFee: {
			utxos: btcFee.utxos,
			feeSatoshis: btcFee.feeSatoshis
		}
	};
};
