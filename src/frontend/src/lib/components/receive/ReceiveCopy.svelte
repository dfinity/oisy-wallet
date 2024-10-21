<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { copyText } from '$lib/utils/share.utils';

	export let address: string;
	export let copyAriaLabel: string;

	const copyToClipboard = async () => {
		await copyText(address);

		toastsShow({
			text: copyAriaLabel,
			level: 'success',
			duration: 2000
		});
	};
</script>

<button
	aria-label={copyAriaLabel}
	class="tertiary icon link flex h-10 w-10 flex-col text-center text-xs font-normal"
	on:click={copyToClipboard}
>
	<IconCopy size="24" />
</button>
