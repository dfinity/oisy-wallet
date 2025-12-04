<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import PayTokenList from '$lib/components/scanner/open-crypto-pay/PayTokensList.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onClose: () => void;
		visible: boolean;
	}

	let { onClose, visible = $bindable() }: Props = $props();
</script>

<div class="fixed inset-0 z-50">
	<BottomSheet bind:visible>
		{#snippet content()}
			<h3 class=" mb-2 text-center">{$i18n.scanner.text.select_token_to_pay}</h3>

			<PayTokenList {onClose} />
		{/snippet}
	</BottomSheet>
	<Backdrop on:nnsClose={() => onClose()} />
</div>
