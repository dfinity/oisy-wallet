import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { trackEvent } from '$lib/services/analytics.services';
import {
	execute,
	type WalletConnectCallBackParams,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionSolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { parseToken } from '$lib/utils/parse.utils';
import { sendSol } from '$sol/services/sol-send.services';
import { isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

type WalletConnectSignAndSendTransactionParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	modalNext: () => void;
	amount: BigNumber;
	onProgress: () => void;
	token: Token;
	identity: OptionIdentity;
};

export const signAndSendTransaction = ({
	address,
	modalNext,
	token,
	onProgress,
	amount,
	identity,
	...params
}: WalletConnectSignAndSendTransactionParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
			const { id, topic } = request;

			const firstParam = request?.params.request.params?.[0];

			const {
				wallet_connect: {
					error: {
						unknown_parameter,
						wallet_not_initialized,
						from_address_not_wallet,
						unknown_destination
					}
				}
			} = get(i18n);

			if (isNullish(firstParam)) {
				toastsError({
					msg: { text: unknown_parameter }
				});
				return { success: false };
			}

			if (isNullish(address)) {
				toastsError({
					msg: { text: wallet_not_initialized }
				});
				return { success: false };
			}

			if (firstParam.from?.toLowerCase() !== address.toLowerCase()) {
				toastsError({
					msg: {
						text: from_address_not_wallet
					}
				});
				return { success: false };
			}

			if (isNullish(firstParam.to)) {
				toastsError({
					msg: { text: unknown_destination }
				});
				return { success: false };
			}

			const { to } = firstParam;

			modalNext();

			try {
				const signature = await sendSol({
					identity,
					token,
					amount: parseToken({
						value: `${amount}`,
						unitName: token.decimals
					}),
					destination: to,
					source: address,
					onProgress
				});

				await listener.approveRequest({ id, topic, message: signature });

				await trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true };
			} catch (err: unknown) {
				await trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
					metadata: {
						token: token.symbol
					}
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: get(i18n).wallet_connect.info.sol_transaction_executed
	});
