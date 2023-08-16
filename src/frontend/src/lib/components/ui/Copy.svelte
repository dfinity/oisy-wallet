<script lang="ts">
	import { IconCopy } from '@dfinity/gix-components';
	import { toastsShow } from '$lib/stores/toasts.store';

	export let value: string;

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(value);
		toastsShow({
			id: Symbol('copy'),
			text: 'Address copied to clipboard.',
			level: 'success',
			duration: 2000
		});
	};
</script>

<button on:click|preventDefault|stopPropagation={copyToClipboard} aria-label={`Copy: ${value}`}>
	<IconCopy />
</button>

<style lang="scss">
	button {
		height: var(--padding-4x);
		width: var(--padding-4x);
		min-width: var(--padding-4x);

		&.icon-only {
			color: var(--tertiary);
		}
	}
</style>
