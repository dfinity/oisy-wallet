<script lang="ts">
	import { IconCopy } from '@dfinity/gix-components';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { copyText } from '$lib/utils/share.utils';

	export let value: string;
	export let text: string;
	export let inline = false;

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
	class="py-1"
	class:inline-block={inline}
	style={`height: var(--padding-4x); width: var(--padding-4x); min-width: var(--padding-4x); ${inline ? "vertical-align: sub;" : ""}`}
>
	<IconCopy />
</button>
