<script lang="ts">
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { createEventDispatcher } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let address: undefined | string;

	const dispatch = createEventDispatcher();
</script>

<div class="stretch min-h-[50vh]">
	<p class="font-bold text-center">{$i18n.wallet.text.address}:</p>
	<p class="mb-4 font-normal text-center px-2">
		<output class="break-all">{address}</output><Copy
			inline
			value={address ?? ''}
			text={$i18n.wallet.text.address_copied}
		/>
	</p>

	<ReceiveQRCode address={address ?? ''} />

	<button class="secondary full center text-center mt-8" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
</div>
