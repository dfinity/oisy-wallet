<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AirdropDateTag from '$lib/components/airdrops/AirdropDateTag.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import type { AirdropDescription } from '$lib/types/airdrop-events';

	export let airdrop: AirdropDescription;
	export let testId: string | undefined = undefined;
</script>

<button
	on:click
	class="h-44 rounded-lg p-4 pt-12 shadow relative w-full flex-1 bg-white"
	data-tid={testId}
>
	<span class="-top-5 left-4 absolute">
		<Logo
			src={airdrop.logo}
			size="xl"
			ring
			color="white"
			testId={nonNullish(testId) ? `${testId}-logo` : undefined}
		/>
	</span>
	<article class="gap-y-4 md:gap-y-2 flex h-full flex-col justify-between">
		<section>
			<p class="m-0 text-lg font-semibold text-start">{airdrop.title}</p>
			<p class="m-0 mt-2 text-xs text-start text-misty-rose">
				{airdrop.oneLiner}
			</p>
		</section>
		<section class="bottom-4 left-4 right-4 max-h-6 min-h-6 md:max-h-14 absolute overflow-hidden">
			<AirdropDateTag
				endDate={airdrop.endDate}
				testId={nonNullish(testId) ? `${testId}-tag` : undefined}
			/>
		</section>
	</article>
</button>
