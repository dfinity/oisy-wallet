<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		text: string;
		maxWords?: number;
	}

	const { text, maxWords = 30 }: Props = $props();

	let expanded = $state(false);

	const wordsSplit = $derived(text.split(' '));
	const truncated = $derived(
		wordsSplit.length > maxWords
			? `${wordsSplit.slice(0, maxWords).join(' ')}${$i18n.core.text.ellipsis}`
			: text
	);
</script>

<div class="inline-block">
	{expanded ? text : truncated}

	{#if wordsSplit.length > maxWords}
		<Button
			ariaLabel={expanded ? $i18n.core.alt.less : $i18n.core.alt.more}
			link
			onclick={() => (expanded = !expanded)}
			styleClass="inline-block"
		>
			{expanded ? $i18n.core.text.less : $i18n.core.text.more}
		</Button>
	{/if}
</div>
