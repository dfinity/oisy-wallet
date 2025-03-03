<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropDateBadge from '$lib/components/airdrops/AirdropDateBadge.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';

	export let airdrop: AirdropDescription;
	export let testId: string | undefined = undefined;
</script>

<button
	on:click
	class="relative w-full flex-1 rounded-lg bg-primary p-4 pt-12 shadow"
	data-tid={testId}
>
	<span class="absolute -top-5 left-4">
		<Logo
			src={airdrop.logo}
			size="xl"
			ring
			color="white"
			testId={nonNullish(testId) ? `${testId}-logo` : undefined}
		/>
	</span>
	<article class="h-full">
		<section>
			<p class="m-0 text-start text-lg font-semibold">{airdrop.cardTitle}</p>
			<p class="m-0 mt-2 text-start text-xs text-tertiary">
				{airdrop.oneLiner}
			</p>
		</section>
		<section class="bottom-4 left-4 mt-3 flex">
			<span class="flex">
				<AirdropDateBadge
					date={airdrop.endDate}
					testId={nonNullish(testId) ? `${testId}-badge` : undefined}
				/></span
			>
		</section>
	</article>
</button>
