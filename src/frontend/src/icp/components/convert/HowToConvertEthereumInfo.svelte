<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
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
	import { HOW_TO_CONVERT_ETHEREUM_INFO } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		formCancelAction?: 'back' | 'close';
	}

	let { formCancelAction = 'back' }: Props = $props();

	const { sourceTokenBalance, sourceToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const ckErc20 = $derived($tokenCkErc20Ledger);

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar testId={HOW_TO_CONVERT_ETHEREUM_INFO}>
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
			address={$ethAddress ?? ''}
			copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
			labelRef="eth-wallet-address"
			network={ETHEREUM_NETWORK}
			qrCodeAction={{
				enabled: true,
				ariaLabel: $i18n.wallet.text.display_wallet_address_qr
			}}
			on:click={() => dispatch('icQRCode')}
		>
			{#snippet title()}
				{replacePlaceholders(replaceOisyPlaceholders($i18n.convert.text.send_eth), {
					$token: $ckEthereumTwinToken.symbol
				})}
			{/snippet}
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
				{#snippet label()}
					{replacePlaceholders($i18n.convert.text.wait_eth_current_balance, {
						$token: $ckEthereumTwinToken.symbol
					})}
				{/snippet}

				{#snippet content()}
					<p class="mb-6">
						{formatToken({
							value: $sourceTokenBalance ?? ZERO,
							unitName: $sourceToken.decimals,
							displayDecimals: $sourceToken.decimals
						})}
						{$sourceToken.symbol}
					</p>
				{/snippet}
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
				{#snippet label()}
					{replacePlaceholders($i18n.convert.text.convert_eth_to_cketh, {
						$token: $ckEthereumTwinToken.symbol,
						$ckToken: $tokenWithFallback.symbol
					})}
				{/snippet}

				{#snippet content()}
					<Button
						colorStyle="secondary"
						fullWidth
						onclick={() => dispatch('icConvert')}
						styleClass="mb-4 mt-3"
					>
						<span class="text-dark-slate-blue font-bold">{$i18n.convert.text.set_amount}</span>
					</Button>
				{/snippet}
			</Value>
		</div>
	</div>

	{#snippet toolbar()}
		{#if formCancelAction === 'back'}
			<ButtonBack fullWidth onclick={() => dispatch('icBack')} />
		{:else}
			<ButtonDone onclick={modalStore.close} />
		{/if}
	{/snippet}
</ContentWithToolbar>
