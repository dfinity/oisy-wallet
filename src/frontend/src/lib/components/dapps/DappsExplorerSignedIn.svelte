<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import DappCard from '$lib/components/dapps/DappCard.svelte';
	import DappModal from '$lib/components/dapps/DappModal.svelte';
	import DappPromoBanner from '$lib/components/dapps/DappPromoBanner.svelte';
	import SubmitDappButton from '$lib/components/dapps/SubmitDappButton.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		type OisyDappDescription,
		dAppDescriptions,
		type FeaturedOisyDappDescription
	} from '$lib/types/oisyDappDescription';
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

	let selectedDapp: OisyDappDescription | undefined = undefined;
	$: selectedDapp = $modalDAppDetails
		? ($modalStore?.data as OisyDappDescription | undefined)
		: undefined;
</script>

<h1 class="mb-5 mt-6">{$i18n.dapps.text.title}</h1>

{#if nonNullish(featuredDapp) && nonNullish(featuredDapp.screenshots)}
	<div class="mb-10">
		<DappPromoBanner
			on:click={() => modalStore.openDappDetails(featuredDapp)}
			dAppDescription={featuredDapp}
		/>
	</div>
{/if}

<div class="flex flex-wrap gap-4">
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

<ul class="mt-8 grid list-none grid-cols-1 gap-x-4 gap-y-7 md:grid-cols-3">
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

{#if $modalDAppDetails && nonNullish(selectedDapp)}
	<DappModal dAppDescription={selectedDapp} />
{/if}
