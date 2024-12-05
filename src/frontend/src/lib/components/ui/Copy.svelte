<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	export let value: string;
	export let text: string;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'blue';
	export let testId: string | undefined = undefined;
</script>

<button
	on:click|preventDefault|stopPropagation={async () => await copyToClipboard({ value, text })}
	aria-label={`${$i18n.core.text.copy}: ${value}`}
	class="pl-0.5"
	data-tid={testId}
	class:py-2={!inline}
	class:inline-block={inline}
	class:text-brand-primary={color === 'blue'}
	class:hover:text-inherit={color === 'blue'}
	class:active:text-inherit={color === 'blue'}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
>
	<IconCopy />
</button>
