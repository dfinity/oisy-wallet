<script lang="ts">
	import type { WebSocketListener } from '$eth/types/listener';
	import type { Erc20Token } from '$eth/types/erc20';
	import { address } from '$lib/derived/address.derived';
	import { toastsError, toastsHide } from '$lib/stores/toasts.store';
	import { debounce } from '@dfinity/utils';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';
	import { getContext, onDestroy, onMount } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { parseToken } from '$lib/utils/parse.utils';
	import {
		getCkErc20FeeData,
		getErc20FeeData,
		getEthFeeData,
		type GetFeeData
	} from '$eth/services/fee.services';
	import type { Network } from '$lib/types/network';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import { infuraProviders } from '$eth/providers/infura.providers';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { isSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
	import {
		toCkErc20HelperContractAddress,
		toCkEthHelperContractAddress
	} from '$icp-eth/utils/cketh.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import type { Token } from '$lib/types/token';

	export let observe: boolean;
	export let destination = '';
	export let amount: string | number | undefined = undefined;
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let nativeEthereumToken: Token;

	const { feeStore }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	const { sendTokenId, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Updating and fetching fee
	 */

	let listener: WebSocketListener | undefined = undefined;

	const errorMsgs: symbol[] = [];

	const updateFeeData = async () => {
		try {
			const params: GetFeeData = {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				to: mapAddressStartsWith0x(destination !== '' ? destination : $address!),
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				from: mapAddressStartsWith0x($address!)
			};

			const { getFeeData } = infuraProviders($sendToken.network.id);

			if (isSupportedEthTokenId($sendTokenId)) {
				feeStore.setFee({
					...(await getFeeData()),
					gas: await getEthFeeData({
						...params,
						helperContractAddress: toCkEthHelperContractAddress(
							$ckEthMinterInfoStore?.[nativeEthereumToken.id],
							sourceNetwork.id
						)
					})
				});
				return;
			}

			const erc20GasFeeParams = {
				contract: $sendToken as Erc20Token,
				amount: parseToken({ value: `${amount ?? '1'}` }),
				sourceNetwork,
				...params
			};

			if (isSupportedErc20TwinTokenId($sendTokenId)) {
				feeStore.setFee({
					...(await getFeeData()),
					gas: await getCkErc20FeeData({
						...erc20GasFeeParams,
						erc20HelperContractAddress: toCkErc20HelperContractAddress(
							$ckEthMinterInfoStore?.[nativeEthereumToken.id]
						)
					})
				});
				return;
			}

			feeStore.setFee({
				...(await getFeeData()),
				gas: await getErc20FeeData({
					...erc20GasFeeParams,
					targetNetwork
				})
			});
		} catch (err: unknown) {
			toastsHide(errorMsgs);

			errorMsgs.push(
				toastsError({
					msg: { text: $i18n.fee.error.cannot_fetch_gas_fee },
					err
				})
			);
		}
	};

	const debounceUpdateFeeData = debounce(updateFeeData);

	const obverseFeeData = async (watch: boolean) => {
		await listener?.disconnect();

		if (!watch) {
			return;
		}

		debounceUpdateFeeData();
		listener = initMinedTransactionsListener({
			callback: async () => debounceUpdateFeeData(),
			networkId: sourceNetwork.id
		});
	};

	onMount(() => debounceUpdateFeeData());
	onDestroy(() => listener?.disconnect());

	/**
	 * Observe input properties for erc20
	 */

	$: obverseFeeData(observe);

	$: $ckEthMinterInfoStore, debounceUpdateFeeData();

	/**
	 * Expose call to evaluate the that way consumers can re-evaluate those imperatively for example when amount or destination are manually updated by the user.
	 */
	export const triggerUpdateFee = () => debounceUpdateFeeData();
</script>

<slot />
