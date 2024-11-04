<script lang="ts">
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import ButtonToggle from '$lib/components/ui/ButtonToggle.svelte';
	import type { AddressToggle } from '$lib/types/toggle';

	export let toggles: AddressToggle[];

	const onToggle = (index: number) => (toggles[index].selected = !toggles[index].selected);
</script>

<div class="w-[calc(100% - 8px)] mx-2 mb-4 flex min-h-fit gap-3 overflow-x-auto pb-2">
	{#each toggles as toggle, index}
		{@const { token, selected } = toggle}

		<ButtonToggle active={selected} on:click={() => onToggle(index)}>
			<TokenLogo data={token} logoSize="xs" />
			{token.symbol}
		</ButtonToggle>
	{/each}
</div>
