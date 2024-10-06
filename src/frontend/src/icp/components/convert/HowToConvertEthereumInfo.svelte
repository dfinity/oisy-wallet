<script lang="ts">
	import { assertNonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic';
	import { isTokenCkErc20Ledger } from '$icp/utils/ic-send.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: IcToken;

	let ckErc20 = false;
	$: ckErc20 = isTokenCkErc20Ledger(token);

	const dispatch = createEventDispatcher();

	const { sendBalance, sendToken, ethereumNativeToken, ethereumNativeTokenBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	assertNonNullish($ethereumNativeToken, 'inconsistency in Ethereum native token');
</script>

<ContentWithToolbar>
	<div>
		<p>
			{replacePlaceholders(
				replaceOisyPlaceholders($i18n.convert.text.how_to_convert_eth_to_cketh),
				{
					$token: $sendToken.symbol,
					$ckToken: token.symbol
				}
			)}:
		</p>
	</div>

	{#if ckErc20}
		<div class="mb-4 mt-2 rounded-lg bg-light-blue p-4">
			<p class="break-normal font-bold">
				{replacePlaceholders($i18n.convert.text.check_balance_for_fees, {
					$token: $ethereumNativeToken.symbol
				})}
			</p>

			<p class="break-normal">
				{replacePlaceholders($i18n.convert.text.fees_explanation, {
					$token: $ethereumNativeToken.symbol
				})}
			</p>

			<p class="break-normal pt-4">
				{$i18n.convert.text.current_balance}&nbsp;<output class="font-bold"
					>{formatToken({
						value: $ethereumNativeTokenBalance ?? ZERO,
						unitName: $ethereumNativeToken.decimals
					})}
					{$ethereumNativeToken.symbol}</output
				>
			</p>
		</div>
	{/if}

	<div class="mt-4 grid grid-cols-[1fr_auto] gap-x-4">
		<div class="mb-2 flex flex-col items-center gap-2 overflow-hidden">
			<span
				class="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] p-2.5 text-xs font-bold text-misty-rose"
				>1</span
			>

			<div class="h-full w-[1.5px] bg-misty-rose"></div>
		</div>

		<ReceiveAddress
			labelRef="eth-wallet-address"
			address={$ethAddress ?? ''}
			qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
			copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
			on:click={() => dispatch('icQRCode')}
		>
			<svelte:fragment slot="title"
				>{replacePlaceholders(replaceOisyPlaceholders($i18n.convert.text.send_eth), {
					$token: $sendToken.symbol
				})}</svelte:fragment
			>
		</ReceiveAddress>

		<div class="mb-2 flex flex-col items-center gap-2 overflow-hidden">
			<span
				class="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] p-2.5 text-xs font-bold text-misty-rose"
				>2</span
			>

			<div class="h-full w-[1.5px] bg-misty-rose"></div>
		</div>

		<div>
			<Value element="div">
				<svelte:fragment slot="label"
					>{replacePlaceholders($i18n.convert.text.wait_eth_current_balance, {
						$token: $sendToken.symbol
					})}</svelte:fragment
				>

				<p class="mb-6">
					{formatToken({
						value: $sendBalance ?? ZERO,
						unitName: $sendToken.decimals,
						displayDecimals: $sendToken.decimals
					})}
					{$sendToken.symbol}
				</p>
			</Value>
		</div>

		<div class="flex justify-center">
			<span
				class="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] p-2.5 text-xs font-bold text-misty-rose"
				>3</span
			>
		</div>

		<div>
			<Value element="div">
				<svelte:fragment slot="label"
					>{replacePlaceholders($i18n.convert.text.convert_eth_to_cketh, {
						$token: $sendToken.symbol,
						$ckToken: token.symbol
					})}</svelte:fragment
				>

				<button class="secondary full center mb-4 mt-3" on:click={() => dispatch('icConvert')}>
					<span class="text-dark-slate-blue font-bold">{$i18n.convert.text.set_amount}</span>
				</button>
			</Value>
		</div>
	</div>

	<div slot="toolbar">
		<button
			type="button"
			class="primary full center text-center"
			on:click={() => dispatch('icBack')}>{$i18n.core.text.back}</button
		>
	</div>
</ContentWithToolbar>
