<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import SkeletonCardWithoutAmount from '$lib/components/ui/SkeletonCardWithoutAmount.svelte';

	export let airdrop;

	let upcomingDate = new Date(Date.now());
	upcomingDate.setDate(upcomingDate.getDate() + 1);

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
		let dateDiff = upcomingDate.getTime() - currentDate.getTime();

		let seconds = Math.floor((dateDiff / 1000) % 60);
		let minutes = Math.floor((dateDiff / 1000 / 60) % 60);
		let hours = Math.floor((dateDiff / (1000 * 60 * 60)) % 24);
		let days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

		dateText = `Ends in: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
	};
</script>

{#if nonNullish(dateText)}
	<button class={`contents`} on:click>
		<AirdropCard>
			<div slot="icon">
				<IconSend size="55" />
			</div>

			<div slot="title">
				{airdrop}
			</div>

			<div slot="description">
				<span class="w-full">{dateText}</span>
			</div>
		</AirdropCard>
	</button>
{:else}
	<SkeletonCardWithoutAmount />
{/if}
