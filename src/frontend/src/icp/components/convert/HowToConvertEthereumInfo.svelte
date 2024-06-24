<script lang="ts">
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { address } from '$lib/derived/address.derived';
	import { createEventDispatcher, getContext } from 'svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		ckEthereumNativeToken,
		ckEthereumNativeTokenBalance,
		ckEthereumTwinToken
	} from '$icp-eth/derived/cketh.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';

	export let formCancelAction: 'back' | 'close' = 'back';

	let ckErc20 = false;
	$: ckErc20 = $tokenCkErc20Ledger;

	const dispatch = createEventDispatcher();

	const { sendBalance, sendTokenDecimals, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<div class="stretch">
	<div>
		<p>
			{replacePlaceholders(
				replaceOisyPlaceholders($i18n.convert.text.how_to_convert_eth_to_cketh),
				{
					$token: $ckEthereumTwinToken.symbol,
					$ckToken: $tokenWithFallback.symbol
				}
			)}:
		</p>
	</div>

	{#if ckErc20}
		<div class="bg-light-blue p-4 mt-2 mb-4 rounded-lg">
			<p class="break-normal font-bold">
				{replacePlaceholders($i18n.convert.text.check_balance_for_fees, {
					$token: $ckEthereumNativeToken.symbol
				})}
			</p>

			<p class="break-normal">
				{replacePlaceholders($i18n.convert.text.fees_explanation, {
					$token: $ckEthereumNativeToken.symbol
				})}
			</p>

			<p class="break-normal pt-4">
				{$i18n.convert.text.current_balance}&nbsp;<output class="font-bold"
					>{formatToken({
						value: $ckEthereumNativeTokenBalance ?? BigNumber.from(0n),
						unitName: $ckEthereumNativeToken.decimals
					})}
					{$ckEthereumNativeToken.symbol}</output
				>
			</p>
		</div>
	{/if}

	<div class="grid grid-cols-[1fr_auto] gap-x-4 mt-4">
		<div class="overflow-hidden flex flex-col gap-2 items-center mb-2">
			<span
				class="inline-flex items-center justify-center text-xs font-bold p-2.5 w-4 h-4 text-misty-rose border-[1.5px] rounded-full"
				>1</span
			>

			<div class="h-full w-[1.5px] bg-misty-rose"></div>
		</div>

		<ReceiveAddress
			labelRef="eth-wallet-address"
			address={$address ?? ''}
			qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
			copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
			on:click={() => dispatch('icQRCode')}
		>
			<svelte:fragment slot="title"
				>{replacePlaceholders(replaceOisyPlaceholders($i18n.convert.text.send_eth), {
					$token: $ckEthereumTwinToken.symbol
				})}</svelte:fragment
			>
		</ReceiveAddress>

		<div class="overflow-hidden flex flex-col gap-2 items-center mb-2">
			<span
				class="inline-flex items-center justify-center text-xs font-bold p-2.5 w-4 h-4 text-misty-rose border-[1.5px] rounded-full"
				>2</span
			>

			<div class="h-full w-[1.5px] bg-misty-rose"></div>
		</div>

		<div>
			<Value element="div">
				<svelte:fragment slot="label"
					>{replacePlaceholders($i18n.convert.text.wait_eth_current_balance, {
						$token: $ckEthereumTwinToken.symbol
					})}</svelte:fragment
				>

				<p class="mb-6">
					{formatToken({
						value: $sendBalance ?? BigNumber.from(0n),
						unitName: $sendTokenDecimals,
						displayDecimals: $sendTokenDecimals
					})}
					{$sendToken.symbol}
				</p>
			</Value>
		</div>

		<div class="flex justify-center">
			<span
				class="inline-flex items-center justify-center text-xs font-bold p-2.5 w-4 h-4 text-misty-rose border-[1.5px] rounded-full"
				>3</span
			>
		</div>

		<div>
			<Value element="div">
				<svelte:fragment slot="label"
					>{replacePlaceholders($i18n.convert.text.convert_eth_to_cketh, {
						$token: $ckEthereumTwinToken.symbol,
						$ckToken: $tokenWithFallback.symbol
					})}</svelte:fragment
				>

				<button class="secondary full center mt-3 mb-4" on:click={() => dispatch('icConvert')}>
					<span class="text-dark-slate-blue font-bold">{$i18n.convert.text.set_amount}</span>
				</button>
			</Value>
		</div>
	</div>
</div>

<div>
	{#if formCancelAction === 'back'}
		<button
			type="button"
			class="primary full center text-center"
			on:click={() => dispatch('icBack')}>{$i18n.core.text.back}</button
		>
	{:else}
		<button type="button" class="primary full center text-center" on:click={modalStore.close}
			>{$i18n.core.text.done}</button
		>
	{/if}
</div>
