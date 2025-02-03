<script lang="ts">
	import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import SkeletonCardWithoutAmount from '$lib/components/ui/SkeletonCardWithoutAmount.svelte';


	let upcomingDate = new Date(Date.now())
	upcomingDate.setDate(upcomingDate.getDate() + 1);

	let countdown: NodeJS.Timeout | undefined;
	let dateText: string;

	onMount(() => {
		countdown = setInterval(calculateTime, 1000);
	});

	onDestroy(() => {
		clearInterval(countdown);
	})

	const calculateTime = () => {
		let currentDate = new Date(Date.now());
		let dateDiff = upcomingDate.getTime() - currentDate.getTime()

		let seconds = Math.floor((dateDiff / 1000) % 60);
		let minutes = Math.floor((dateDiff / 1000 / 60) % 60);
		let hours = Math.floor((dateDiff / (1000 * 60 * 60)) % 24);
		let days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

		dateText = `Starts in: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
	}
</script>


{#if nonNullish(dateText)}
	<button class={`contents`} on:click>

		<AirdropCard>
			<div slot="icon">
				<IconSend />
			</div>

			<div slot="title">
				title
			</div>

			<div slot="description">
					<span class="w-full">{dateText}</span>
			</div>

		</AirdropCard>
	</button>
{:else}
	<SkeletonCardWithoutAmount />
{/if}