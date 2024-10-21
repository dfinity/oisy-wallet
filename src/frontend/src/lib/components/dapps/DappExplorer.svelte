<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import DappCard from '$lib/components/dapps/DappCard.svelte';
	import DappModal from '$lib/components/dapps/DappModal.svelte';
	import DappPromoBanner from '$lib/components/dapps/DappPromoBanner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		type DappDescription,
		dAppDescriptions,
		type FeaturedDappDescription
	} from '$lib/types/dappDescription';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let selectedTag: string | null = null;
	const featuredDapp: FeaturedDappDescription | undefined = dAppDescriptions.find(
		(dApp) => dApp.featured && nonNullish(dApp.screenshots) && dApp.screenshots.length > 0
	) as FeaturedDappDescription | undefined;

	const uniqueTags = new Set(
		dAppDescriptions.flatMap((dapp) => dapp.tags).sort((tagA, tagB) => tagA.localeCompare(tagB))
	);

	$: filteredDapps = nonNullish(selectedTag)
		? dAppDescriptions.filter((dApp) => dApp.tags.includes(selectedTag!))
		: dAppDescriptions;

	$: selectedDapp = $modalDAppDetails
		? ($modalStore?.data as DappDescription | undefined)
		: undefined;
</script>

<h1 class="mb-5 mt-6">{$i18n.dapp_explorer.text.title}</h1>

{#if nonNullish(featuredDapp) && nonNullish(featuredDapp.screenshots)}
	<div class="mb-10">
		<DappPromoBanner
			on:click={() => modalStore.openDappDetails(featuredDapp)}
			dAppDescription={featuredDapp}
		/>
	</div>
{/if}

<div class="flex flex-wrap gap-4 {$$restProps.class || ''}">
	<Button
		paddingSmall
		ariaLabel={$i18n.dapp_explorer.alt.show_all}
		on:click={() => (selectedTag = null)}
		styleClass="text-nowrap max-w-fit text-sm"
		colorStyle={selectedTag === null ? 'primary' : 'tertiary'}
		>{$i18n.dapp_explorer.text.all_dapps}</Button
	>
	{#each uniqueTags as tag}
		<Button
			paddingSmall
			ariaLabel={replacePlaceholders($i18n.dapp_explorer.alt.show_tag, { $tag: tag })}
			on:click={() => (selectedTag = tag)}
			styleClass="text-nowrap max-w-fit text-sm"
			colorStyle={selectedTag === tag ? 'primary' : 'tertiary'}>{tag}</Button
		>
	{/each}
</div>

<ul class="mt-8 grid list-none grid-cols-1 gap-x-4 gap-y-7 md:grid-cols-3">
	{#each filteredDapps as dApp}
		<li class="flex">
			<DappCard
				on:click={() => {
					modalStore.openDappDetails(dApp);
				}}
				dAppDescription={dApp}
			/>
		</li>
	{/each}
</ul>

{#if $modalDAppDetails && selectedDapp}
	<DappModal dAppDescription={selectedDapp} />
{/if}
