<script lang="ts">
	import { preventDefault } from '@dfinity/gix-components';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onClick: () => void;
	}

	let { onClick }: Props = $props();
</script>

<button
	class="text-brand-primary hover:text-inherit active:text-inherit"
	aria-label={$i18n.send.text.open_qr_modal}
	data-tid="qr-code-scanner-button"
	onclick={preventDefault(onClick)}
	type="button"
>
	<IconScanLine />
</button>
