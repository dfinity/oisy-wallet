<script lang="ts">
	import IconCircleCheck from '$lib/components/icons/lucide/IconCircleCheck.svelte';
	import { OISY_URL } from '$lib/constants/oisy.constants';
	import {
		NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON,
		NOTES_SHARE_RECIPIENT_OUTRO
	} from '$lib/constants/test-ids.constants';
	import { trackPersonalNoteShare } from '$lib/services/personal-notes-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const features = $derived([
		$i18n.notes.share.recipient.outro_feature_multichain,
		$i18n.notes.share.recipient.outro_feature_onchain,
		$i18n.notes.share.recipient.outro_feature_encrypted
	]);
</script>

<div class="flex flex-1 flex-col gap-5 py-4 text-center" data-tid={NOTES_SHARE_RECIPIENT_OUTRO}>
	<span class="text-sm font-bold text-brand-primary"
		>{replaceOisyPlaceholders($i18n.notes.share.recipient.outro_eyebrow)}</span
	>
	<h1 class="text-2xl font-bold text-primary">{$i18n.notes.share.recipient.outro_title}</h1>
	<p class="text-tertiary">{replaceOisyPlaceholders($i18n.notes.share.recipient.outro_subtitle)}</p>

	<ul class="flex flex-col gap-2 text-secondary">
		{#each features as feature (feature)}
			<li class="flex items-center justify-center gap-2">
				<span class="text-success-primary"><IconCircleCheck size="18" /></span>
				{feature}
			</li>
		{/each}
	</ul>

	<!-- Same-tab navigation: the outro is the end of the flow with no other action,
	     so there is nothing to return to — opening a new tab would only litter. -->
	<a
		class="as-button primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 no-underline"
		data-tid={NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON}
		href={OISY_URL}
		onclick={() =>
			trackPersonalNoteShare({ step: 'discover', side: 'recipient', sourceDetail: 'outro' })}
	>
		{$i18n.notes.share.recipient.discover}
	</a>
</div>
