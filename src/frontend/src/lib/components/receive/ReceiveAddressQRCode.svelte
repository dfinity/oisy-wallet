<script lang="ts">
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	export let address: undefined | string;
	export let addressLabel: string | undefined = undefined;
</script>

<div class="stretch min-h-[50vh]">
	<p class="text-center font-bold">{addressLabel ?? $i18n.wallet.text.address}:</p>
	<p class="mb-4 px-2 text-center font-normal">
		<output class="break-all">{address}</output>
		<Copy inline value={address ?? ''} text={$i18n.wallet.text.address_copied} />
	</p>

	<ReceiveQRCode address={address ?? ''} />
</div>

<button class="secondary" on:click={modalStore.close}>
	{$i18n.core.text.close}
</button>
