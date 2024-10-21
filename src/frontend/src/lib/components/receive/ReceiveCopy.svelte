<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
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

<ButtonIcon ariaLabel={copyAriaLabel} on:click={copyToClipboard}>
	<IconCopy size="24" slot="icon" />
</ButtonIcon>
