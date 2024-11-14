<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button
	type="button"
	data-tid="qr-code-scanner-button"
	on:click|preventDefault
	aria-label={$i18n.send.text.open_qr_modal}
	class="text-brand-primary hover:text-inherit active:text-inherit"
>
	<IconQRCodeScanner />
</button>
