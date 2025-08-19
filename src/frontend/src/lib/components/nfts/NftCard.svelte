<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nft: Nft;
		testId?: string;
		disabled?: boolean;
	}

	let { nft, testId, disabled }: Props = $props();
</script>

<a
	class="flex w-full flex-col gap-2 p-1 text-left no-underline hover:text-inherit"
	class:cursor-not-allowed={disabled}
	data-tid={testId}
	href={`${AppPath.Nfts}${nft.collection.network.name}-${nft.collection.address}/${nft.id}`}
	onclick={disabled ? (e) => e.preventDefault() : undefined}
>
	<div
		class="relative aspect-square overflow-hidden rounded-xl bg-primary-light"
		class:opacity-50={disabled}
	>
		{#if nonNullish(nft.imageUrl)}
			<BgImg imageUrl={nft?.imageUrl} shadow="none" size="contain" testId={`${testId}-image`} />
		{:else}
			<div class="bg-black/16 rounded-lg" data-tid={`${testId}-placeholder`}></div>
		{/if}

		<div class="absolute bottom-2 right-2 flex items-center gap-1">
			{#if nonNullish(nft.balance)}
				<Badge testId={`${testId}-balance`} variant="outline">{nft.balance}x</Badge>
			{/if}

			<NetworkLogo
				color="white"
				network={nft.collection.network}
				size="xs"
				testId={`${testId}-network`}
			/>
		</div>
	</div>

	<div class="flex w-full flex-col gap-1">
		<span
			class="truncate text-sm font-bold"
			class:text-disabled={disabled}
			class:text-primary={!disabled}>{nft.collection.name}</span
		>
		<span class="text-xs" class:text-disabled={disabled} class:text-tertiary={!disabled}
			>#{nft.id}</span
		>
	</div>
</a>
