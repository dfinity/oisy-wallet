<script lang="ts">
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		NOTES_UNAVAILABLE,
		NOTES_UNAVAILABLE_RETRY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		// True when the load failed because the vetKey request was rate-limited — a
		// transient "wait and try again" rather than a generic failure.
		rateLimited?: boolean;
		onRetry: () => void;
	}

	let { rateLimited = false, onRetry }: Props = $props();

	const subtitle = $derived(rateLimited ? $i18n.notes.error.rate_limited : $i18n.notes.error.load);
</script>

<div
	class="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center"
	data-tid={NOTES_UNAVAILABLE}
>
	<div class="text-tertiary"><IconClock size="48" /></div>

	<div class="flex flex-col gap-3">
		<h1 class="text-xl font-bold text-primary">{$i18n.notes.text.unavailable_title}</h1>
		<span class="text-tertiary">{subtitle}</span>
	</div>

	<Button onclick={onRetry} testId={NOTES_UNAVAILABLE_RETRY_BUTTON}>
		{$i18n.core.text.retry}
	</Button>
</div>
