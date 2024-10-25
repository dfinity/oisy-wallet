<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	let termsList: string[];
	$: termsList = [
		$i18n.terms_and_conditions.text.paragraph_1,
		$i18n.terms_and_conditions.text.paragraph_2,
		$i18n.terms_and_conditions.text.paragraph_3,
		$i18n.terms_and_conditions.text.limited_license,
		$i18n.terms_and_conditions.text.restrictions,
		$i18n.terms_and_conditions.text.applicable_laws,
		$i18n.terms_and_conditions.text.reservation_rights,
		$i18n.terms_and_conditions.text.feedback,
		$i18n.terms_and_conditions.text.termination,
		$i18n.terms_and_conditions.text.warranty_liability,
		$i18n.terms_and_conditions.text.indemnity,
		$i18n.terms_and_conditions.text.governing_law,
		$i18n.terms_and_conditions.text.entire_agreement,
		$i18n.terms_and_conditions.text.assignment,
		$i18n.terms_and_conditions.text.no_waiver,
		$i18n.terms_and_conditions.text.english_version
	];
</script>

<h1 class="text-5xl">{replaceOisyPlaceholders($i18n.terms_and_conditions.text.title)}</h1>

<section class="mt-12">
	{#each termsList as terms}
		<p><Html text={replaceOisyPlaceholders(terms)} /></p>
	{/each}
</section>
