<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, onMount } from 'svelte';
	import { infuraProviders } from '$eth/providers/infura.providers';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';
	import {
		getCkErc20FeeData,
		getErc20FeeData,
		getEthFeeData,
		type GetFeeData
	} from '$eth/services/fee.services';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import {
		toCkErc20HelperContractAddress,
		toCkEthHelperContractAddress
	} from '$icp-eth/utils/cketh.utils';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsHide } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let observe: boolean;
	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let nativeEthereumToken: Token;
	export let sendToken: Token;
	export let sendTokenId: TokenId;

	const { feeStore }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	/**
	 * Updating and fetching fee
	 */

	let listener: WebSocketListener | undefined = undefined;

	const errorMsgs: symbol[] = [];

	const updateFeeData = async () => {
		try {
			const params: GetFeeData = {
				to: mapAddressStartsWith0x(destination !== '' ? destination : $ethAddress!),

				from: mapAddressStartsWith0x($ethAddress!)
			};

			const { getFeeData } = infuraProviders(sendToken.network.id);

			const { gasPrice, maxPriorityFeePerGas, maxFeePerGas } = await getFeeData();

			const feeDataBigInt = {
				gasPrice: nonNullish(gasPrice) ? gasPrice.toBigInt() : gasPrice,
				maxPriorityFeePerGas: nonNullish(maxPriorityFeePerGas)
					? maxPriorityFeePerGas.toBigInt()
					: maxPriorityFeePerGas,
				maxFeePerGas: nonNullish(maxFeePerGas) ? maxFeePerGas.toBigInt() : maxFeePerGas
			};

			if (isSupportedEthTokenId(sendTokenId)) {
				feeStore.setFee({
					...feeDataBigInt,
					gas: getEthFeeData({
						...params,
						helperContractAddress: toCkEthHelperContractAddress(
							$ckEthMinterInfoStore?.[nativeEthereumToken.id]
						)
					})
				});
				return;
			}

			const erc20GasFeeParams = {
				contract: sendToken as Erc20Token,
				amount: parseToken({ value: `${amount ?? '1'}` }),
				sourceNetwork,
				...params
			};

			if (isSupportedErc20TwinTokenId(sendTokenId)) {
				feeStore.setFee({
					...feeDataBigInt,
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
				...feeDataBigInt,
				gas: await getErc20FeeData({
					...erc20GasFeeParams,
					targetNetwork,
					to:
						// When converting "ICP Erc20" to native ICP, the destination address is an "old" ICP hex account identifier.
						// Therefore, it should not be prefixed with 0x.
						isNetworkICP(targetNetwork) ? destination : erc20GasFeeParams.to
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
			// eslint-disable-next-line require-await
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
	 * Expose a call to evaluate, so that consumers can re-evaluate imperatively, for example, when the amount or destination is manually updated by the user.
	 */
	export const triggerUpdateFee = () => debounceUpdateFeeData();
</script>

<slot />
