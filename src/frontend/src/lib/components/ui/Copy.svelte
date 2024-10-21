<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { copyText } from '$lib/utils/share.utils';

	export let value: string;
	export let text: string;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'blue';

	const copyToClipboard = async () => {
		await copyText(value);

		toastsShow({
			text,
			level: 'success',
			duration: 2000
		});
	};
</script>

<button
	on:click|preventDefault|stopPropagation={copyToClipboard}
	aria-label={`${$i18n.core.text.copy}: ${value}`}
	class="pl-0.5"
	class:py-2={!inline}
	class:inline-block={inline}
	class:text-primary={color === 'blue'}
	class:hover:text-inherit={color === 'blue'}
	class:active:text-inherit={color === 'blue'}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
>
	<IconCopy />
</button>
