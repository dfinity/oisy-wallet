<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Header from '$lib/components/hero/Header.svelte';
	import SharedNoteLocked from '$lib/components/notes/SharedNoteLocked.svelte';
	import SharedNoteOutro from '$lib/components/notes/SharedNoteOutro.svelte';
	import SharedNoteRevealed from '$lib/components/notes/SharedNoteRevealed.svelte';
	import SharedNoteUnavailable from '$lib/components/notes/SharedNoteUnavailable.svelte';
	import {
		TRACK_NOTE_SHARE_RECIPIENT_REVEALED,
		TRACK_NOTE_SHARE_RECIPIENT_UNAVAILABLE,
		TRACK_NOTE_SHARE_RECIPIENT_VIEW
	} from '$lib/constants/analytics.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { loadSharedNote } from '$lib/services/personal-note-share.services';

	type RecipientState = 'locked' | 'revealed' | 'outro' | 'unavailable';

	const token = $derived(page.params.token ?? '');

	// The per-share key rides in the URL fragment (`#k=…`), which browsers never
	// send to the server or include in the `Referer` header.
	const shareKey = (): string | undefined => {
		if (!browser) {
			return undefined;
		}
		const key = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('k');
		return nonNullish(key) && notEmptyString(key) ? key : undefined;
	};

	let flow = $state<RecipientState>('locked');
	let note = $state('');
	let singleUse = $state(false);
	let busy = $state(false);

	onMount(() => trackEvent({ name: TRACK_NOTE_SHARE_RECIPIENT_VIEW }));

	// One neutral end state for every failure — expired, already-used, unknown
	// token, or a missing/garbled key — so a reader can never tell them apart.
	const toUnavailable = () => {
		note = '';
		flow = 'unavailable';
		trackEvent({ name: TRACK_NOTE_SHARE_RECIPIENT_UNAVAILABLE });
	};

	const onReveal = async () => {
		const key = shareKey();
		// Fail closed on a missing/garbled key without a backend call, so an
		// unopenable link can never burn a single-use share.
		if (isNullish(key)) {
			toUnavailable();
			return;
		}

		busy = true;
		try {
			const { note: revealedNote, singleUse: revealedSingleUse } = await loadSharedNote({
				token,
				key
			});
			note = revealedNote;
			singleUse = revealedSingleUse;
			flow = 'revealed';
			trackEvent({
				name: TRACK_NOTE_SHARE_RECIPIENT_REVEALED,
				metadata: { single_use: `${singleUse}` }
			});
		} catch (_err: unknown) {
			toUnavailable();
		} finally {
			busy = false;
		}
	};

	// Advancing to the outro clears the decrypted plaintext from the DOM.
	const onDone = () => {
		note = '';
		flow = 'outro';
	};
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<Header />

	<main class="flex flex-1 items-center justify-center px-4 py-8">
		<div
			class="flex max-h-[80dvh] w-full max-w-[576px] flex-col rounded-3xl bg-primary p-6 shadow-lg md:p-8"
		>
			{#if flow === 'locked'}
				<SharedNoteLocked {busy} {onReveal} />
			{:else if flow === 'revealed'}
				<SharedNoteRevealed {note} {onDone} {singleUse} />
			{:else if flow === 'outro'}
				<SharedNoteOutro />
			{:else}
				<SharedNoteUnavailable />
			{/if}
		</div>
	</main>
</div>
