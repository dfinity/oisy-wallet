<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';

	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div class="flex justify-center gap-1">
	<button
		aria-label={qrCodeAriaLabel}
		class="text-blue hover:text-dark-blue active:text-dark-blue"
		on:click><IconQRCodeScanner /></button
	>

	<Copy inline value={address} text={copyAriaLabel} />
</div>
