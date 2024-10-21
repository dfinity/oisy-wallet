<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	export let address: string;
	export let copyAriaLabel: string;
</script>

<ButtonIcon
	ariaLabel={copyAriaLabel}
	on:click={async () => await copyToClipboard({ value: address, text: copyAriaLabel })}
>
	<IconCopy size="24" slot="icon" />
</ButtonIcon>
