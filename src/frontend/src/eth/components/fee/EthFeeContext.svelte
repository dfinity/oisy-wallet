<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, onMount } from 'svelte';
	import { ETH_FEE_DATA_LISTENER_DELAY } from '$eth/constants/eth.constants';
	import { infuraProviders } from '$eth/providers/infura.providers';
	import { InfuraGasRest } from '$eth/rest/infura.rest';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';
	import {
		getCkErc20FeeData,
		getErc20FeeData,
		getEthFeeData,
		type GetFeeData
	} from '$eth/services/fee.services';
	import {
		encodeErc1155SafeTransfer,
		encodeErc721SafeTransfer
	} from '$eth/services/nft-send.services';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
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
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
	import { maxBigInt } from '$lib/utils/bigint.utils';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let observe: boolean;
	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let data: string | undefined = undefined;
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let nativeEthereumToken: Token;
	export let sendToken: Token;
	export let sendTokenId: TokenId;
	export let sendNft: Nft | undefined = undefined;

	const { feeStore }: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	/**
	 * Updating and fetching fee
	 */

	let listener: WebSocketListener | undefined = undefined;

	const errorMsgs: symbol[] = [];

	const updateFeeData = async () => {
		try {
			if (isNullish($ethAddress)) {
				return;
			}

			const params: GetFeeData = {
				to: mapAddressStartsWith0x(destination !== '' ? destination : $ethAddress),
				from: mapAddressStartsWith0x($ethAddress)
			};

			const { getFeeData, safeEstimateGas, estimateGas } = infuraProviders(sendToken.network.id);

			const { maxFeePerGas, maxPriorityFeePerGas, ...feeDataRest } = await getFeeData();

			const { getSuggestedFeeData } = new InfuraGasRest(
				(sendToken.network as EthereumNetwork).chainId
			);

			const {
				maxFeePerGas: suggestedMaxFeePerGas,
				maxPriorityFeePerGas: suggestedMaxPriorityFeePerGas
			} = await getSuggestedFeeData();

			const feeData = {
				...feeDataRest,
				maxFeePerGas: maxBigInt(maxFeePerGas, suggestedMaxFeePerGas) ?? null,
				maxPriorityFeePerGas: maxBigInt(maxPriorityFeePerGas, suggestedMaxPriorityFeePerGas) ?? null
			};

			const feeDataGas = getEthFeeData({
				...params,
				helperContractAddress: toCkEthHelperContractAddress(
					$ckEthMinterInfoStore?.[nativeEthereumToken.id]
				)
			});

			// We estimate gas only when it is not a ck-conversion (i.e. target network is not ICP).
			// Otherwise, we would need to emulate the data that are provided to the minter contract address.
			const estimatedGas = isNetworkICP(targetNetwork)
				? undefined
				: await safeEstimateGas({ ...params, data });

			if (isSupportedEthTokenId(sendTokenId) || isSupportedEvmNativeTokenId(sendTokenId)) {
				feeStore.setFee({
					...feeData,
					gas: maxBigInt(feeDataGas, estimatedGas)
				});
				return;
			}

			const erc20GasFeeParams = {
				contract: sendToken as Erc20Token,
				amount: parseToken({ value: `${amount ?? '1'}`, unitName: sendToken.decimals }),
				sourceNetwork,
				...params
			};

			if (isSupportedErc20TwinTokenId(sendTokenId)) {
				feeStore.setFee({
					...feeData,
					gas: await getCkErc20FeeData({
						...erc20GasFeeParams,
						erc20HelperContractAddress: toCkErc20HelperContractAddress(
							$ckEthMinterInfoStore?.[nativeEthereumToken.id]
						)
					})
				});
				return;
			}

			if (nonNullish(sendNft)) {
				const { to, data } =
					sendNft.collection.standard === 'erc721'
						? encodeErc721SafeTransfer({
								contractAddress: sendNft.collection.address,
								from: $ethAddress,
								to: destination,
								tokenId: sendNft.id
							})
						: encodeErc1155SafeTransfer({
								contractAddress: sendNft.collection.address,
								from: $ethAddress,
								to: destination,
								tokenId: sendNft.id,
								amount: 1n,
								data: '0x'
							});

				const estimatedGasNft = await estimateGas({ from: $ethAddress, to, data });

				feeStore.setFee({
					...feeData,
					gas: estimatedGasNft
				});
				return;
			}

			feeStore.setFee({
				...feeData,
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

	let listenerCallbackTimer: NodeJS.Timeout | undefined;
	const obverseFeeData = async (watch: boolean) => {
		const throttledCallback = () => {
			// to make sure we don't update UI too often, we listen to the WS updates max. once per 10 secs
			if (isNullish(listenerCallbackTimer)) {
				listenerCallbackTimer = setTimeout(() => {
					debounceUpdateFeeData();

					listenerCallbackTimer = undefined;
				}, ETH_FEE_DATA_LISTENER_DELAY);
			}
		};

		await listener?.disconnect();

		if (!watch) {
			return;
		}

		debounceUpdateFeeData();
		listener = initMinedTransactionsListener({
			// eslint-disable-next-line require-await
			callback: async () => throttledCallback(),
			networkId: sourceNetwork.id
		});
	};

	onMount(() => {
		observe && debounceUpdateFeeData();
	});
	onDestroy(() => {
		listener?.disconnect();
		listener = undefined;
		clearTimeout(listenerCallbackTimer);
	});

	/**
	 * Observe input properties for erc20
	 */

	$: obverseFeeData(observe);

	$: ($ckEthMinterInfoStore,
		(() => {
			observe && debounceUpdateFeeData();
		})());

	/**
	 * Expose a call to evaluate, so that consumers can re-evaluate imperatively, for example, when the amount or destination is manually updated by the user.
	 */
	export const triggerUpdateFee = () => debounceUpdateFeeData();
</script>

<slot />
