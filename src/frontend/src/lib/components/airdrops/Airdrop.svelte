<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
	import SkeletonCardWithoutAmount from '$lib/components/ui/SkeletonCardWithoutAmount.svelte';
	import type { AirdropDescription } from '$lib/types/airdrop-events';
	import Img from '$lib/components/ui/Img.svelte';

	export let airdrop: AirdropDescription;

	let countdown: NodeJS.Timeout | undefined;
	let dateText: string;

	onMount(() => {
		countdown = setInterval(calculateTime, 1000);
	});

	onDestroy(() => {
		clearInterval(countdown);
	});

	const calculateTime = () => {
		let currentDate = new Date(Date.now());
		let startDiff = airdrop.startDate.getTime() - currentDate.getTime();
		let endDiff = airdrop.endDate.getTime() - currentDate.getTime();

		if (startDiff > 0) {
			let seconds = Math.floor((startDiff / 1000) % 60);
			let minutes = Math.floor((startDiff / 1000 / 60) % 60);
			let hours = Math.floor((startDiff / (1000 * 60 * 60)) % 24);
			let days = Math.floor(startDiff / (1000 * 60 * 60 * 24));

			dateText = `Starts in: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
		} else if (startDiff <= 0 && endDiff > 0) {
			let seconds = Math.floor((endDiff / 1000) % 60);
			let minutes = Math.floor((endDiff / 1000 / 60) % 60);
			let hours = Math.floor((endDiff / (1000 * 60 * 60)) % 24);
			let days = Math.floor(endDiff / (1000 * 60 * 60 * 24));

			dateText = `Ends in: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
		}
	};
</script>

{#if nonNullish(dateText)}
	<button class={`contents`} on:click>
		<AirdropCard>
			<div slot="icon">
				<Img
					height="55"
					width="55"
					rounded
					src={airdrop.logo}
				/>
			</div>

			<div slot="title">
				{airdrop.title}
			</div>

			<div slot="description">
				<span class="w-full">{dateText}</span>
			</div>
		</AirdropCard>
	</button>
{:else}
	<SkeletonCardWithoutAmount />
{/if}
