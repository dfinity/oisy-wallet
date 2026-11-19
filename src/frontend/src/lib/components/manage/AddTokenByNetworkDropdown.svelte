<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Select from '$lib/components/ui/Select.svelte';
	import SelectOption from '$lib/components/ui/SelectOption.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';

	interface Props {
		availableNetworks: Network[];
		disabled?: boolean;
		networkName?: string;
	}

	let { networkName = $bindable(), availableNetworks, disabled = false }: Props = $props();
</script>

<Value element="div" ref="network">
	{#snippet label()}
		{$i18n.tokens.manage.text.network}:
	{/snippet}

	{#snippet content()}
		<div
			id="network"
			style={`${disabled ? '--input-background: var(--color-background-disabled);' : ''}`}
			class="network mt-1 pt-0.5"
			class:disabled
		>
			<Select name="network" {disabled} bind:selectedValue={networkName}>
				<option class:hidden={nonNullish(networkName)} disabled selected value={undefined}
					>{$i18n.tokens.manage.placeholder.select_network}</option
				>
				{#each availableNetworks as network (network.id)}
					<SelectOption value={network.name}>{network.name}</SelectOption>
				{/each}
			</Select>
		</div>
	{/snippet}
</Value>

<style lang="scss">
	:global(.disabled div.select) {
		--input-border-size: 0;
	}
</style>
