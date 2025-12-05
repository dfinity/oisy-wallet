<script lang="ts">
	import PayTokenList from '$lib/components/scanner/open-crypto-pay/PayTokensList.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onClose: () => void;
		visible: boolean;
	}

	let { onClose, visible = $bindable() }: Props = $props();
</script>

<BottomSheet bind:visible {onClose}>
	{#snippet content()}
		<h3 class=" mb-2 text-center">{$i18n.scanner.text.select_token_to_pay}</h3>

		<PayTokenList {onClose} />
	{/snippet}
</BottomSheet>
