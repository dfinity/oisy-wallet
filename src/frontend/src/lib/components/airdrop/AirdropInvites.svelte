<script lang="ts">
	import type { Info } from '$declarations/airdrop/airdrop.did';
	import type { CodeText } from '$lib/types/airdrop';
	import { fromNullable } from '@dfinity/utils';
	import IconShare from "$lib/components/icons/IconShare.svelte";

	export let airdrop: Info;

	let children: [CodeText, boolean][] = [];
	$: children = fromNullable(airdrop.children) ?? [];
</script>

{#each children as [code, state], i}
	{@const last = i === children.length - 1}
	<div
		class="flex ml-6"
		style={`border-left: 1px solid var(--color-platinum); border-top: 1px solid var(--color-platinum); border-right: 1px solid var(--color-platinum); ${
			i > 0 ? 'border-bottom: 1px solid var(--color-platinum);' : ''
		}`}
		class:rounded-tl-sm={i === 0}
		class:rounded-tr-sm={i === 0}
		class:rounded-bl-sm={last}
		class:rounded-br-sm={last}
	>
		<div class="font-bold p-2" style="border-right: 1px solid var(--color-platinum); width: var(--padding-6x)">
			<span class:opacity-15={state}>{i}</span>
		</div>
		<div class:state class="flex justify-between items-center px-2 gap-4" style="width: calc(100% - var(--padding-6x))">
			<div class="flex gap-1 truncate">
				<span class="font-bold truncate" class:opacity-15={state}>{code}</span>

				{#if state}
					<span class="font-bold text-mountain-meadow">+2 ICP</span>
				{/if}
			</div>

			<button class:opacity-15={state} disabled={state} class="flex gap-0.5 font-bold text-blue text-sm"><IconShare /> Share</button>
		</div>
	</div>
{/each}
