<script lang="ts">
	import { toastsShow } from '$lib/stores/toasts.store';
	import { copyText } from '$lib/utils/share.utils';
	import IconCopy from "$lib/components/icons/IconCopy.svelte";

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
	aria-label={`Copy: ${value}`}
	class="pl-0.5"
	class:py-2={!inline}
	class:inline-block={inline}
	class:text-blue={color === 'blue'}
	class:hover:text-dark-blue={color === 'blue'}
	class:active:text-dark-blue={color === 'blue'}
	class:hover:text-blue={color === 'inherit'}
	class:active:text-blue={color === 'inherit'}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
>
	<IconCopy />
</button>
