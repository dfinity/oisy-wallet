<script lang="ts">
	import { BtcSendValidationError, type BtcValidationError } from '$btc/types/btc-send';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	/**
	 * This function handles the validation errors thrown by the validateUtxosForSend function
	 * It has been moved to a component so it can be shared between the BTC Send and Convert Wizard
	 * @param err BtcValidationError - The validation error that was thrown
	 * @param $i18n I18n - The i18n store containing translation strings
	 * @returns Promise<void> - Returns void if successful, may throw errors if validation fails
	 */
	export const handleBtcValidationError = async ({ err }: { err: BtcValidationError }) => {
		// Safety check: ensure error object exists and has the expected structure
		if (!err || typeof err !== 'object' || !('type' in err) || !err.type) {
			console.error('Invalid error object passed to handleBtcValidationError:', err);
			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});
			return;
		}

		switch (err.type) {
			case BtcSendValidationError.AuthenticationRequired:
				await nullishSignOut();
				return;
			case BtcSendValidationError.NoNetworkId:
				toastsError({
					msg: { text: $i18n.send.error.no_btc_network_id }
				});
				break;
			case BtcSendValidationError.InvalidDestination:
				toastsError({
					msg: { text: $i18n.send.assertion.destination_address_invalid }
				});
				break;
			case BtcSendValidationError.InvalidAmount:
				toastsError({
					msg: { text: $i18n.send.assertion.amount_invalid }
				});
				break;
			case BtcSendValidationError.UtxoFeeMissing:
				toastsError({
					msg: { text: $i18n.send.assertion.utxos_fee_missing }
				});
				break;
			case BtcSendValidationError.TokenUndefined:
				toastsError({
					msg: { text: $i18n.tokens.error.unexpected_undefined }
				});
				break;
			case BtcSendValidationError.InsufficientBalance:
				toastsError({
					msg: { text: $i18n.send.assertion.btc_insufficient_balance }
				});
				break;
			case BtcSendValidationError.InsufficientBalanceForFee:
				toastsError({
					msg: { text: $i18n.send.assertion.btc_insufficient_balance_for_fee }
				});
				break;
			case BtcSendValidationError.InvalidUtxoData:
				toastsError({
					msg: { text: $i18n.send.assertion.btc_invalid_utxo_data }
				});
				break;
			case BtcSendValidationError.UtxoLocked:
				toastsError({
					msg: { text: $i18n.send.assertion.btc_utxo_locked }
				});
				break;
			case BtcSendValidationError.InvalidFeeCalculation:
				toastsError({
					msg: { text: $i18n.send.assertion.btc_invalid_fee_calculation }
				});
				break;
			case BtcSendValidationError.MinimumBalance:
				toastsError({
					msg: { text: $i18n.send.assertion.minimum_btc_amount }
				});
				break;
			default:
				toastsError({
					msg: { text: $i18n.send.error.unexpected },
					err
				});
				break;
		}
	};
</script>
