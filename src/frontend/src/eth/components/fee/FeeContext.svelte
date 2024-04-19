<script lang="ts">
	import type { WebSocketListener } from '$eth/types/listener';
	import type { Erc20Token } from '$eth/types/erc20';
	import { address } from '$lib/derived/address.derived';
	import { toastsError, toastsHide } from '$lib/stores/toasts.store';
	import { debounce } from '@dfinity/utils';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';
	import { getContext, onDestroy } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { parseToken } from '$lib/utils/parse.utils';
	import { getErc20FeeData, getEthFeeData, type GetFeeData } from '$eth/services/fee.services';
	import type { Network } from '$lib/types/network';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import { infuraProviders } from '$eth/providers/infura.providers';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { isCkEthHelperContract } from '$eth/utils/send.utils';
	import { ethereumTokenId } from '$eth/derived/token.derived';
	import { isSupportedErc20TwinTokenId } from '$eth/utils/token.utils';

	export let observe: boolean;
	export let destination = '';
	export let amount: string | number | undefined = undefined;
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;

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
				address: mapAddressStartsWith0x(destination !== '' ? destination : $address!)
			};

			const { getFeeData } = infuraProviders($sendToken.network.id);

			if (isSupportedEthTokenId($sendTokenId) || isSupportedErc20TwinTokenId($sendTokenId)) {
				feeStore.setFee({
					...(await getFeeData()),
					gas: await getEthFeeData({
						...params,
						helperContractAddress: $ckEthHelperContractAddressStore?.[$ethereumTokenId]
					})
				});
				return;
			}

			feeStore.setFee({
				...(await getFeeData()),
				gas: await getErc20FeeData({
					contract: $sendToken as Erc20Token,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					address: mapAddressStartsWith0x(destination !== '' ? destination : $address!),
					amount: parseToken({ value: `${amount ?? '1'}` }),
					sourceNetwork,
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

		await updateFeeData();
		listener = initMinedTransactionsListener({
			callback: async () => debounceUpdateFeeData(),
			networkId: sourceNetwork.id
		});
	};

	onDestroy(() => listener?.disconnect());

	/**
	 * Observe input properties for erc20
	 */

	$: obverseFeeData(observe);

	$: amount, destination, $ckEthHelperContractAddressStore, debounceUpdateFeeData();
</script>

<slot />
