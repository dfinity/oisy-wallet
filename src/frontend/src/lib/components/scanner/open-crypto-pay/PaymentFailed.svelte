<script lang="ts">
	import PaymentStatusHero from '$lib/components/scanner/open-crypto-pay/PaymentStatusHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col w-full">
	<PaymentStatusHero status="failure" />

	{#snippet toolbar()}
		<Button fullWidth onclick={onClose}>{$i18n.scanner.text.try_again}</Button>
	{/snippet}
</ContentWithToolbar>
