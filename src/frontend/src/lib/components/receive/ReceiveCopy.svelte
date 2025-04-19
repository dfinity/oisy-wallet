<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	export let address: string;
	export let copyAriaLabel: string;
	export let testId: string | undefined = undefined;
</script>

<ButtonIcon
	ariaLabel={copyAriaLabel}
	on:click={async () => await copyToClipboard({ value: address, text: copyAriaLabel })}
	{testId}
	link={false}
>
	<IconCopy size="24" slot="icon" />
</ButtonIcon>
