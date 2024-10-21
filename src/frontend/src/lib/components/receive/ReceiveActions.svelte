<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON } from '$lib/constants/test-ids.constants';

	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div class="flex justify-center gap-2">
	<button
		aria-label={qrCodeAriaLabel}
		class="tertiary icon link flex h-10 w-10 flex-col text-center text-xs font-normal"
		data-tid={RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}
		on:click
	>
		<IconQRCodeScanner size="24" />
	</button>

	<ReceiveCopy {address} {copyAriaLabel} />
</div>
