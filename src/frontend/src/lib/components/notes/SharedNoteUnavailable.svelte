<script lang="ts">
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import { TRACK_NOTE_SHARE_RECIPIENT_DISCOVER } from '$lib/constants/analytics.constants';
	import { OISY_URL } from '$lib/constants/oisy.constants';
	import {
		NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON,
		NOTES_SHARE_RECIPIENT_UNAVAILABLE
	} from '$lib/constants/test-ids.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div
	class="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center"
	data-tid={NOTES_SHARE_RECIPIENT_UNAVAILABLE}
>
	<div class="text-tertiary"><IconClock size="48" /></div>
	<h1 class="text-xl font-bold text-primary">
		{$i18n.notes.share.recipient.unavailable_title}
	</h1>
	<!-- Same-tab navigation: this dead-end state has no other action, so there is
	     nothing to return to — opening a new tab would only litter. -->
	<a
		class="as-button primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 no-underline"
		data-tid={NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON}
		href={OISY_URL}
		onclick={() =>
			trackEvent({
				name: TRACK_NOTE_SHARE_RECIPIENT_DISCOVER,
				metadata: { source: 'unavailable' }
			})}
	>
		{$i18n.notes.share.recipient.discover}
	</a>
</div>
