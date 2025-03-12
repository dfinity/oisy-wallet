<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ETHEREUM_NETWORK } from '$env/networks/networks.env';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';
	import {
		ckEthereumNativeToken,
		ckEthereumNativeTokenBalance,
		ckEthereumTwinToken
	} from '$icp-eth/derived/cketh.derived';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	export let formCancelAction: 'back' | 'close' = 'back';

	let ckErc20 = false;
	$: ckErc20 = $tokenCkErc20Ledger;

	const dispatch = createEventDispatcher();

	const { sendBalance, sendTokenDecimals, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
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
		<div class="mb-4 mt-2 rounded-lg bg-brand-subtle-20 p-4">
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
						value: $ckEthereumNativeTokenBalance ?? ZERO,
						unitName: $ckEthereumNativeToken.decimals
					})}
					{$ckEthereumNativeToken.symbol}</output
				>
			</p>
		</div>
	{/if}

	<div class="mt-4 grid grid-cols-[1fr_auto] gap-x-4">
		<div class="mb-2 flex flex-col items-center gap-2 overflow-hidden">
			<span
				class="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] p-2.5 text-xs font-bold text-tertiary"
				>1</span
			>

			<div class="h-full w-[1.5px] bg-tertiary"></div>
		</div>

		<ReceiveAddress
			labelRef="eth-wallet-address"
			address={$ethAddress ?? ''}
			network={ETHEREUM_NETWORK}
			qrCodeAction={{
				enabled: true,
				ariaLabel: $i18n.wallet.text.display_wallet_address_qr
			}}
			copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
			on:click={() => dispatch('icQRCode')}
		>
			<svelte:fragment slot="title"
				>{replacePlaceholders(replaceOisyPlaceholders($i18n.convert.text.send_eth), {
					$token: $ckEthereumTwinToken.symbol
				})}</svelte:fragment
			>
		</ReceiveAddress>

		<div class="mb-2 flex flex-col items-center gap-2 overflow-hidden">
			<span
				class="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] p-2.5 text-xs font-bold text-tertiary"
				>2</span
			>

			<div class="h-full w-[1.5px] bg-tertiary"></div>
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
						value: $sendBalance ?? ZERO,
						unitName: $sendTokenDecimals,
						displayDecimals: $sendTokenDecimals
					})}
					{$sendToken.symbol}
				</p>
			</Value>
		</div>

		<div class="flex justify-center">
			<span
				class="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] p-2.5 text-xs font-bold text-tertiary"
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

				<Button
					colorStyle="secondary"
					fullWidth
					styleClass="mb-4 mt-3"
					on:click={() => dispatch('icConvert')}
				>
					<span class="text-dark-slate-blue font-bold">{$i18n.convert.text.set_amount}</span>
				</Button>
			</Value>
		</div>
	</div>

	<svelte:fragment slot="toolbar">
		{#if formCancelAction === 'back'}
			<ButtonBack fullWidth on:click={() => dispatch('icBack')} />
		{:else}
			<ButtonDone on:click={modalStore.close} />
		{/if}
	</svelte:fragment>
</ContentWithToolbar>
