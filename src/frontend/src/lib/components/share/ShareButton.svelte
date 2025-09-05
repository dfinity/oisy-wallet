<script lang="ts">
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { canShare, shareText } from '$lib/utils/share.utils';

	interface Props {
		shareAriaLabel: string;
		testId?: string;
	}

	let { shareAriaLabel, testId }: Props = $props();
</script>

{#if canShare()}
	<ButtonIcon
		ariaLabel={shareAriaLabel}
		link={false}
		onclick={async () => await shareText(shareAriaLabel)}
		{testId}
	>
		{#snippet icon()}
			<IconShareArrow size="24" />
		{/snippet}
	</ButtonIcon>
{/if}
