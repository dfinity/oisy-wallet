<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import PaymentStatusHero from './PaymentStatusHero.svelte';

	export let onClose: () => void;
</script>

<ContentWithToolbar styleClass="flex flex-col w-full">
	<PaymentStatusHero status="success" />
	{#snippet toolbar()}
		<Button fullWidth onclick={onClose}>{$i18n.core.text.done}</Button>
	{/snippet}
</ContentWithToolbar>
