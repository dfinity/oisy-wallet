<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import DappCard from '$lib/components/dapps/DappCard.svelte';
	import DappPromoBanner from '$lib/components/dapps/DappPromoBanner.svelte';
	import SubmitDappButton from '$lib/components/dapps/SubmitDappButton.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { dAppDescriptions, type FeaturedOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// For the moment only the first featured dapp is highlighted
	const selectFirstFeaturedDapp = (): FeaturedOisyDappDescription | undefined =>
		dAppDescriptions.find(
			({ featured, screenshots }) => featured && nonNullish(screenshots) && screenshots.length
		) as FeaturedOisyDappDescription | undefined;

	const featuredDapp = selectFirstFeaturedDapp();

	let selectedTag: string | undefined = undefined;
	const uniqueTags = new Set(
		dAppDescriptions.flatMap((dapp) => dapp.tags).sort((tagA, tagB) => tagA.localeCompare(tagB))
	);

	$: filteredDapps = dAppDescriptions.filter(
		({ tags }) => isNullish(selectedTag) || tags.includes(selectedTag)
	);
</script>

<PageTitle>{$i18n.dapps.text.title}</PageTitle>

{#if nonNullish(featuredDapp) && nonNullish(featuredDapp.screenshots)}
	<div class="mb-6 md:mb-10">
		<DappPromoBanner
			on:click={() => modalStore.openDappDetails(featuredDapp)}
			dAppDescription={featuredDapp}
		/>
	</div>
{/if}

<div class="no-scrollbar flex gap-4 overflow-x-auto p-1 md:flex-wrap md:p-0">
	<Button
		paddingSmall
		ariaLabel={$i18n.dapps.alt.show_all}
		on:click={() => (selectedTag = undefined)}
		styleClass="text-nowrap max-w-fit text-sm"
		colorStyle={selectedTag === undefined ? 'primary' : 'tertiary'}
		>{$i18n.dapps.text.all_dapps}</Button
	>
	{#each uniqueTags as tag}
		<Button
			paddingSmall
			ariaLabel={replacePlaceholders($i18n.dapps.alt.show_tag, { $tag: tag })}
			on:click={() => (selectedTag = tag)}
			styleClass="text-nowrap max-w-fit text-sm"
			colorStyle={selectedTag === tag ? 'primary' : 'tertiary'}>{tag}</Button
		>
	{/each}
</div>

<ul class="mt-10 grid list-none grid-cols-2 flex-row gap-x-4 gap-y-10 md:grid-cols-3">
	{#each filteredDapps as dApp}
		<li class="flex" in:fade>
			<DappCard
				on:click={() => {
					modalStore.openDappDetails(dApp);
				}}
				dAppDescription={dApp}
			/>
		</li>
	{/each}
</ul>

<SubmitDappButton />

<style lang="postcss">
	@media (max-width: 360px) {
		ul {
			@apply grid-cols-1;
		}
	}
</style>
