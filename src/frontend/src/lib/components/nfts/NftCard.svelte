<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nft: Nft;
		testId?: string;
		disabled?: boolean;
		isHidden?: boolean;
		isSpam?: boolean;
		selectable?: boolean;
		onSelect?: (nft: Nft) => void;
	}

	let { nft, testId, disabled, isHidden, isSpam, selectable, onSelect }: Props = $props();

	const onClick = () => {
		if (selectable && nonNullish(onSelect) && !disabled) {
			onSelect(nft);
			return;
		}
		if (!selectable && !disabled) {
			goto(`${AppPath.Nfts}${nft.collection.network.name}-${nft.collection.address}/${nft.id}`);
		}
	};
</script>

<button
	class="group block w-full flex-col gap-2 rounded-xl text-left no-underline transition-all duration-300 hover:text-inherit"
	class:cursor-not-allowed={disabled}
	class:hover:-translate-y-1={!disabled}
	class:hover:bg-primary={!disabled}
	data-tid={testId}
	onclick={onClick}
>
	<span
		class="relative block aspect-square overflow-hidden rounded-xl bg-secondary-alt"
		class:opacity-50={disabled}
	>
		<NftImageConsent {nft} type="card-selectable">
			<div class="h-full w-full">
				<BgImg
					imageUrl={nft?.imageUrl}
					shadow="inset"
					size="cover"
					styleClass="group-hover:scale-110 transition-transform duration-300 ease-out"
					testId={`${testId}-image`}
				/>
			</div>
		</NftImageConsent>

		{#if isHidden}
			<div class="absolute left-2 top-2 invert dark:invert-0">
				<IconEyeOff size="24" />
			</div>
		{/if}

		{#if isSpam}
			<div class="absolute left-2 top-2 text-warning-primary">
				<IconAlertOctagon size="24" />
			</div>
		{/if}

		<span class="absolute bottom-2 right-2 block flex items-center gap-1">
			{#if nonNullish(nft.balance)}
				<Badge testId={`${testId}-balance`} variant="outline">{nft.balance}x</Badge>
			{/if}

			<NetworkLogo
				color="white"
				network={nft.collection.network}
				size="xs"
				testId={`${testId}-network`}
			/>
		</span>
	</span>

	<span class="flex w-full flex-col gap-1 px-2 pb-2">
		<span
			class="truncate text-sm font-bold"
			class:text-disabled={disabled}
			class:text-primary={!disabled}>{nft.name}</span
		>
		<span class="text-xs" class:text-disabled={disabled} class:text-tertiary={!disabled}
			>#{nft.id}</span
		>
	</span>
</button>
