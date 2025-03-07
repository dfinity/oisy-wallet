<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropDateBadge from '$lib/components/airdrops/AirdropDateBadge.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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
	<span class="absolute right-4 top-3">
		<AirdropDateBadge
			date={airdrop.endDate}
			testId={nonNullish(testId) ? `${testId}-badge` : undefined}
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
			<div>
				<Button colorStyle="primary" styleClass="py-2" paddingSmall
					>{$i18n.airdrops.text.check_earnings}</Button
				>
			</div></section
		>
	</article>
</button>
