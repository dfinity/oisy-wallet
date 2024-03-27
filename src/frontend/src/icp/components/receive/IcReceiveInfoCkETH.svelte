<script lang="ts">
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher } from 'svelte';
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<ReceiveAddress
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
	copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
	on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
>
	<svelte:fragment slot="title">{$i18n.wallet.text.wallet_address}</svelte:fragment>
	<svelte:fragment slot="text">{$i18n.receive.cketh.text.use_address_from_to}</svelte:fragment>
</ReceiveAddress>

<div class="mb-6">
	<Hr />
</div>

<Value ref="ethereum-helper-contract" element="div">
	<svelte:fragment slot="label">{$i18n.receive.ethereum.text.from_network}</svelte:fragment>

	<p class="text-misty-rose break-normal py-2">
		{replaceOisyPlaceholders($i18n.receive.ethereum.text.eth_to_cketh_description)}
	</p>
</Value>

<button class="secondary full center mt-6 mb-8" on:click={() => dispatch('icConvert')}>
	<span class="text-dark-slate-blue font-bold"
		>{$i18n.receive.ethereum.text.learn_how_to_convert}</span
	>
</button>

<button class="primary full center text-center mb-6" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
