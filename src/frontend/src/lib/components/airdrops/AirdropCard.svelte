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
	class="h-40 rounded-lg p-4 pt-12 shadow relative w-full flex-1 bg-primary"
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
	<article class="h-full">
		<section>
			<p class="m-0 text-lg font-semibold text-start">{airdrop.title}</p>
			<p class="m-0 mt-2 text-xs text-misty-rose text-start">
				{airdrop.oneLiner}
			</p>
		</section>
		<section class="bottom-4 left-4 max-h-6 min-h-6 md:max-h-14 absolute overflow-hidden">
			<AirdropDateBadge
				date={airdrop.endDate}
				testId={nonNullish(testId) ? `${testId}-badge` : undefined}
			/>
		</section>
	</article>
</button>
