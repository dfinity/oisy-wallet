<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON } from '$lib/constants/test-ids.constants';

	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div class="flex justify-center gap-2">
	<ButtonIcon ariaLabel={qrCodeAriaLabel} on:click testId={RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}>
		<IconQRCodeScanner size="24" slot="icon" />
	</ButtonIcon>

	<ReceiveCopy {address} {copyAriaLabel} />
</div>
