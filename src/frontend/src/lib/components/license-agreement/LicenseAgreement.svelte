<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let agreementList = $derived([
		$i18n.license_agreement.text.paragraph_1,
		$i18n.license_agreement.text.paragraph_2,
		$i18n.license_agreement.text.paragraph_3,
		$i18n.license_agreement.text.limited_license,
		$i18n.license_agreement.text.restrictions,
		$i18n.license_agreement.text.applicable_laws,
		$i18n.license_agreement.text.reservation_rights,
		$i18n.license_agreement.text.feedback,
		$i18n.license_agreement.text.termination,
		$i18n.license_agreement.text.warranty_liability,
		$i18n.license_agreement.text.indemnity,
		$i18n.license_agreement.text.governing_law,
		$i18n.license_agreement.text.entire_agreement,
		$i18n.license_agreement.text.assignment,
		$i18n.license_agreement.text.no_waiver,
		$i18n.license_agreement.text.english_version
	]);
</script>

{#if NEW_AGREEMENTS_ENABLED}
	<MarkdownWithSidebar
		stringReplacements={{ $date: 'todo' }}
		text={replaceOisyPlaceholders($i18n.license_agreement.text.body)}
		title={replaceOisyPlaceholders($i18n.license_agreement.text.title)}
	/>
{:else}
	<h1 class="text-5xl">{replaceOisyPlaceholders($i18n.license_agreement.text.title)}</h1>

	<section class="mt-12">
		{#each agreementList as agreement, index (`agreement-${index}`)}
			<p>
				<Html text={replaceOisyPlaceholders(agreement)} />
			</p>
		{/each}
	</section>
{/if}
