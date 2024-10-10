<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import {
		RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON,
		RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON
	} from '$lib/constants/test-ids.constants';

	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
	export let copyTestId: string = RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON;

</script>

<div class="flex justify-center gap-1">
	<button
		aria-label={qrCodeAriaLabel}
		class="text-blue hover:text-dark-blue active:text-dark-blue"
		data-tid={RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}
		on:click
	>
		<IconQRCodeScanner />
	</button>

	<Copy inline value={address} text={copyAriaLabel} testId={copyTestId} />
</div>
