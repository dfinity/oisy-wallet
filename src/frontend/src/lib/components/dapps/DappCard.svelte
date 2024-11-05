<script lang="ts">
	import DappTags from '$lib/components/dapps/DappTags.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type {
		OisyDappDescription,
		OisyDappDescriptionDimension
	} from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: OisyDappDescription;
	$: ({ name: dAppName, logo, oneLiner, tags } = dAppDescription);

	let calculateClampValue = (dAppDescription: OisyDappDescriptionDimension) =>
		dAppDescription.nameHeight > 30
			? dAppDescription.tagSectionHeight > 30
				? 2
				: 4
			: dAppDescription.tagSectionHeight > 30
				? 4
				: 6;

	let nameHeight: number;
	let tagSectionHeight: number;
	let clamp: number;

	$: clamp = calculateClampValue({ nameHeight, tagSectionHeight });
</script>

<button
	aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppName: dAppName })}
	on:click
	class="relative h-44 flex-1 rounded-lg bg-white p-4 pt-12 shadow md:h-60"
>
	<span class="absolute -top-5 left-4">
		<Logo
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dAppName })}
			size="xl"
			ring
			color="white"
		/>
	</span>
	<article class="flex h-full flex-col justify-between gap-y-4 md:gap-y-2">
		<section>
			<p
				class="m-0 line-clamp-2 overflow-hidden text-start text-lg font-semibold"
				bind:offsetHeight={nameHeight}
			>
				{dAppName}
			</p>
			<p
				title={oneLiner}
				class:md:line-clamp-2={clamp === 2}
				class:md:line-clamp-4={clamp === 4}
				class:md:line-clamp-6={clamp === 6}
				class="m-0 mt-2 overflow-hidden text-ellipsis text-start text-xs text-misty-rose line-clamp-2"
			>
				{oneLiner}
			</p>
		</section>
		<section class="max-h-14 min-h-6 overflow-y-hidden" bind:offsetHeight={tagSectionHeight}>
			<DappTags {dAppName} {tags} />
		</section>
	</article>
</button>
