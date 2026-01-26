<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, onMount, type Snippet, untrack } from 'svelte';
	import { ETH_FEE_DATA_LISTENER_DELAY } from '$eth/constants/eth.constants';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';
	import {
		getCkErc20FeeData,
		getErc20FeeData,
		getEthFeeData,
		getEthFeeDataWithProvider
	} from '$eth/services/fee.services';
	import {
		encodeErc1155SafeTransfer,
		encodeErc721SafeTransfer
	} from '$eth/services/nft-transfer.services';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isCollectionErc1155 } from '$eth/utils/erc1155.utils';
	import { isCollectionErc721 } from '$eth/utils/erc721.utils';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import {
		toCkErc20HelperContractAddress,
		toCkEthHelperContractAddress
	} from '$icp-eth/utils/cketh.utils';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsHide } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Network } from '$lib/types/network';
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
	import { maxBigInt } from '$lib/utils/bigint.utils';
	import { assertIsNetworkEthereum, isNetworkICP } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		observe: boolean;
		destination?: string;
		amount?: OptionAmount;
		data?: string;
		sourceNetwork: EthereumNetwork;
		targetNetwork?: Network;
		nativeEthereumToken: Token;
		sendToken: Token;
		sendTokenId: TokenId;
		sendNft?: Nft;
		children: Snippet;
	}

	let {
		observe,
		destination = '',
		amount,
		data,
		sourceNetwork,
		targetNetwork,
		nativeEthereumToken,
		sendToken,
		sendTokenId,
		sendNft,
		children
	}: Props = $props();

	const { feeStore }: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	/**
	 * Updating and fetching fee
	 */

	let listener = $state<WebSocketListener | undefined>();

	const errorMsgs: symbol[] = [];

	const updateFeeData = async () => {
		try {
			if (isNullish($ethAddress)) {
				return;
			}

			const { network } = sendToken;

			assertIsNetworkEthereum(network);

			const { feeData, provider, params } = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: $ethAddress,
				to: destination !== '' ? destination : $ethAddress
			});

			const { safeEstimateGas, estimateGas } = provider;

			const feeDataGas = getEthFeeData({
				...params,
				helperContractAddress: toCkEthHelperContractAddress(
					$ckEthMinterInfoStore?.[nativeEthereumToken.id]
				)
			});

			if (isSupportedEthTokenId(sendTokenId) || isSupportedEvmNativeTokenId(sendTokenId)) {
				// We estimate gas only when it is not a ck-conversion (i.e. target network is not ICP).
				// Otherwise, we would need to emulate the data that are provided to the minter contract address.
				const estimatedGas = isNetworkICP(targetNetwork)
					? undefined
					: await safeEstimateGas({
							...params,
							...(nonNullish(amount)
								? { value: parseToken({ value: amount.toString(), unitName: sendToken.decimals }) }
								: {}),
							data
						});

				feeStore.setFee({
					...feeData,
					gas: maxBigInt(feeDataGas, estimatedGas)
				});

				return;
			}

			const erc20GasFeeParams = {
				...params,
				contract: sendToken as Erc20Token,
				amount: parseToken({ value: `${amount ?? '1'}`, unitName: sendToken.decimals }),
				sourceNetwork
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
				const { to, data } = isCollectionErc721(sendNft.collection)
					? encodeErc721SafeTransfer({
							contractAddress: sendNft.collection.address,
							from: $ethAddress,
							to: destination,
							tokenId: sendNft.id
						})
					: isCollectionErc1155(sendNft.collection)
						? encodeErc1155SafeTransfer({
								contractAddress: sendNft.collection.address,
								from: $ethAddress,
								to: destination,
								tokenId: sendNft.id,
								amount: 1n,
								data: '0x'
							})
						: (() => {
								throw new Error($i18n.send.error.fee_calc_unsupported_standard);
							})();

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

	let listenerCallbackTimer = $state<NodeJS.Timeout | undefined>();

	let isDestroyed = $state(false);

	const obverseFeeData = async () => {
		const throttledCallback = () => {
			// to make sure we don't update the UI too often, we listen to the WS updates max. once per 10 secs
			if (isNullish(listenerCallbackTimer)) {
				listenerCallbackTimer = setTimeout(() => {
					debounceUpdateFeeData();

					listenerCallbackTimer = undefined;
				}, ETH_FEE_DATA_LISTENER_DELAY);
			}
		};

		await listener?.disconnect();

		// There could be a race condition where the component is destroyed before the listener is connected.
		// However, the flow still connects the listener and updates the UI.
		if (isDestroyed) {
			return;
		}

		if (!observe) {
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

	onDestroy(async () => {
		isDestroyed = true;
		await listener?.disconnect();
		listener = undefined;
		clearTimeout(listenerCallbackTimer);
	});

	/**
	 * Observe input properties for erc20
	 */

	$effect(() => {
		[observe];

		untrack(() => obverseFeeData());
	});

	$effect(() => {
		[$ckEthMinterInfoStore];

		if (observe) {
			untrack(() => debounceUpdateFeeData());
		}
	});

	/**
	 * Expose a call to evaluate so that consumers can re-evaluate imperatively, for example, when the user manually updates the amount or destination.
	 */
	export const triggerUpdateFee = () => debounceUpdateFeeData();
</script>

{@render children()}
