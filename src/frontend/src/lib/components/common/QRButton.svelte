<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
</script>

<button
	type="button"
	data-tid="qr-code-scanner-button"
	on:click|preventDefault
	aria-label="Scan QR code"
>
	<IconQRCodeScanner />
</button>
