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
	link={false}
	onclick={async () => await copyToClipboard({ value: address, text: copyAriaLabel })}
	{testId}
>
	{#snippet icon()}
		<IconCopy size="24" />
	{/snippet}
</ButtonIcon>
