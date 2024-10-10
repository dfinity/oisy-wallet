<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON } from '$lib/constants/test-ids.constants';

	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div class="flex justify-center gap-1">
	<button
		aria-label={qrCodeAriaLabel}
		class="text-primary hover:text-inherit active:text-inherit"
		data-tid={RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}
		on:click
	>
		<IconQRCodeScanner />
	</button>

	<Copy inline value={address} text={copyAriaLabel} />
</div>
