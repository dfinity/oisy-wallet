<script lang="ts">
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher } from 'svelte';
	import IcReceiveInfoBlock from '$icp/components/receive/IcReceiveInfoBlock.svelte';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<IcReceiveInfoBlock
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	qrCodeAriaLabel="Display wallet address as a QR code"
	copyAriaLabel="Wallet address copied to clipboard."
	on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
>
	<svelte:fragment slot="title">Wallet address</svelte:fragment>
	<svelte:fragment slot="text"
		>Use for all tokens when receiving from wallets, users or other apps that support this address
		format.</svelte:fragment
	>
</IcReceiveInfoBlock>

<div class="mb-6">
	<Hr />
</div>

<IcReceiveInfoBlock
	labelRef="icp-account-id"
	address={$icpAccountIdentifierText ?? ''}
	qrCodeAriaLabel="Display ICP Account ID as a QR code"
	copyAriaLabel="ICP Account ID copied to clipboard."
	on:click={() => displayQRCode($icpAccountIdentifierText ?? '')}
>
	<svelte:fragment slot="title">ICP Account ID</svelte:fragment>
	<svelte:fragment slot="text"
		>Use for ICP deposits from exchanges or other wallets that only support Account IDs.</svelte:fragment
	>
</IcReceiveInfoBlock>

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}>Done</button>
