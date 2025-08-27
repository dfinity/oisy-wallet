<script lang="ts">
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { NftCollection } from '$lib/types/nft';

	interface Props {
		collection: NftCollection
	}

	let { collection }:Props = $props()
</script>

<Button
	colorStyle="tertiary-alt"
	innerStyleClass="h-5"
	onclick={() => {
		// TODO spam
		console.log('spam', collection);
	}}
	paddingSmall
	styleClass="rounded-lg border-brand-subtle-30 p-2"
>
	<span class="flex items-center gap-1">
		<IconAlertOctagon size="18" />
		<span class="flex px-[2px] font-semibold">Spam</span>
	</span>
</Button>