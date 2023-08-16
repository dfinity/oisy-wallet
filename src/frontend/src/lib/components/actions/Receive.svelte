<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { addressStoreNotLoaded } from '$lib/stores/address.store';
	import { isBusy } from '$lib/stores/busy.store';

	let disabled;
	$: disabled = $addressStoreNotLoaded || $isBusy;
</script>

<button class="flex-1 secondary" {disabled} class:opacity-50={disabled}>
	<IconReceive size="28" />
	<span>Receive</span></button
>
