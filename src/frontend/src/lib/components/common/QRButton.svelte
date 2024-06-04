<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button
	type="button"
	data-tid="qr-code-scanner-button"
	on:click|preventDefault
	aria-label={$i18n.send.text.open_qr_modal}
	class="text-blue hover:text-dark-blue active:text-dark-blue"
>
	<IconQRCodeScanner />
</button>
