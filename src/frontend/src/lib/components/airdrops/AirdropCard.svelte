<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import type { AirdropDescription } from '$lib/types/airdrop-events';
	import AirdropDateTag from '$lib/components/airdrops/AirdropDateTag.svelte';

	export let testId: string | undefined = undefined;
	export let airdrop: AirdropDescription;
</script>

<button on:click class="relative h-44 w-full flex-1 rounded-lg bg-white p-4 pt-12 shadow">
	<span class="absolute -top-5 left-4">
		<Logo
			src={airdrop.logo}
			size="xl"
			ring
			color="white"
		/>
	</span>
	<article class="flex h-full flex-col justify-between gap-y-4 md:gap-y-2">
		<section>
			<p class="m-0 text-start text-lg font-semibold">{airdrop.title}</p>
			<p class="m-0 mt-2 text-start text-xs text-misty-rose">
				{airdrop.oneLiner}
			</p>
		</section>
		<section class="absolute bottom-4 left-4 right-4 max-h-6 min-h-6 overflow-hidden md:max-h-14">
			<AirdropDateTag endDate={airdrop.endDate} />
		</section>
	</article>
</button>