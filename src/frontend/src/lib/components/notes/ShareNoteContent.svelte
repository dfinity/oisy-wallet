<script lang="ts">
	import type { Identity } from '@icp-sdk/core/agent';
	import { onMount } from 'svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import { MAX_PERSONAL_NOTE_SHARES_PER_USER } from '$lib/constants/app.constants';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		NOTES_SHARE_CAP_MESSAGE,
		NOTES_SHARE_CREATE_BUTTON,
		NOTES_SHARE_DONE_BUTTON,
		NOTES_SHARE_LINK_COPY,
		NOTES_SHARE_SINGLE_USE_CHECKBOX
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { createNoteShare, getActiveShareCount } from '$lib/services/personal-note-share.services';
	import { trackPersonalNoteShare } from '$lib/services/personal-notes-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { PersonalNoteUi } from '$lib/types/personal-note';
	import { replaceIcErrorFields } from '$lib/utils/error.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { personalNotePreviewParts } from '$lib/utils/personal-note.utils';

	interface Props {
		note: PersonalNoteUi;
		identity: Identity;
		onClose: () => void;
	}

	let { note, identity, onClose }: Props = $props();

	const HOUR_MS = 60 * 60 * 1000;
	const EXPIRY_OPTIONS = [
		{ labelKey: 'expiry_1h', ms: HOUR_MS },
		{ labelKey: 'expiry_24h', ms: 24 * HOUR_MS },
		{ labelKey: 'expiry_7d', ms: 7 * 24 * HOUR_MS },
		{ labelKey: 'expiry_30d', ms: 30 * 24 * HOUR_MS }
	] as const;

	const preview = $derived(personalNotePreviewParts(note.note));

	let durationMs = $state(24 * HOUR_MS);
	let singleUse = $state(false);
	let busy = $state(false);
	let createdLink = $state<string | undefined>();
	let atCap = $state(false);

	// The count query gates the UI; the backend `TooManyShares` rejection stays
	// authoritative. A failed count is non-fatal — leave the action enabled and
	// let create surface the cap.
	onMount(async () => {
		try {
			atCap = (await getActiveShareCount({ identity })) >= MAX_PERSONAL_NOTE_SHARES_PER_USER;
		} catch (_: unknown) {
			atCap = false;
		}
	});

	const selectedExpiryLabel = $derived(
		$i18n.notes.share.text[
			(EXPIRY_OPTIONS.find(({ ms }) => ms === durationMs) ?? EXPIRY_OPTIONS[1]).labelKey
		]
	);

	// Locale-independent expiry label for analytics (e.g. `7d`) — the option key,
	// never the localized text, so no locale leaks into metadata.
	const expiryLabel = $derived(
		(EXPIRY_OPTIONS.find(({ ms }) => ms === durationMs) ?? EXPIRY_OPTIONS[1]).labelKey.replace(
			'expiry_',
			''
		)
	);

	const recap = $derived(
		`${replacePlaceholders($i18n.notes.share.text.recap_expires_in, { $duration: selectedExpiryLabel })}${
			singleUse ? ` · ${$i18n.notes.share.text.recap_single_use}` : ''
		}`
	);

	const onCreate = async () => {
		if (atCap || busy) {
			return;
		}
		busy = true;
		try {
			const { link } = await createNoteShare({
				identity,
				note: note.note,
				durationMs,
				singleUse
			});
			createdLink = link;
			trackPersonalNoteShare({
				step: 'create',
				side: 'creator',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				singleUse,
				expiry: expiryLabel
			});
		} catch (err: unknown) {
			trackPersonalNoteShare({
				step: 'create',
				side: 'creator',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				singleUse,
				expiry: expiryLabel,
				error: replaceIcErrorFields(err)
			});
			// Lost a race to the cap since mount (e.g. another tab): reflect it in
			// the UI instead of only toasting a generic failure.
			if (err !== null && typeof err === 'object' && 'TooManyShares' in err) {
				atCap = true;
				return;
			}
			toastsError({ msg: { text: $i18n.notes.share.error.create }, err });
		} finally {
			busy = false;
		}
	};
</script>

<ContentWithToolbar styleClass="flex min-h-0 flex-col items-stretch gap-4 overflow-y-auto">
	{#if createdLink === undefined}
		<!-- State A — configure -->
		{#if atCap}
			<p class="shrink-0 text-sm text-tertiary" data-tid={NOTES_SHARE_CAP_MESSAGE}>
				{replacePlaceholders($i18n.notes.share.text.cap_reached, {
					$max: `${MAX_PERSONAL_NOTE_SHARES_PER_USER}`
				})}
			</p>
		{/if}
		<div class="flex flex-col gap-1 rounded-lg border border-brand-subtle-20 p-3">
			<span style="overflow-wrap: anywhere;" class="truncate font-bold text-primary">
				{preview.title}
			</span>
			{#if preview.body !== ''}
				<span style="overflow-wrap: anywhere;" class="line-clamp-2 text-sm text-tertiary">
					{preview.body}
				</span>
			{/if}
		</div>
		<span class="text-xs text-tertiary">{$i18n.notes.share.text.snapshot_caption}</span>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-bold text-primary">{$i18n.notes.share.text.expires_after}</span>
			<div class="flex flex-wrap gap-2 [&_button]:text-sm">
				{#each EXPIRY_OPTIONS as option (option.ms)}
					<PillButton onClick={() => (durationMs = option.ms)} selected={durationMs === option.ms}>
						{$i18n.notes.share.text[option.labelKey]}
					</PillButton>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-bold text-primary">{$i18n.notes.share.text.single_use}</span>
			<!-- `--checkbox-label-order: 1` puts the box before the label (leading, like
				 the transaction-filter panels); `flex-start` top-aligns the box in case
				 the label wraps on a narrow viewport. -->
			<div style="--checkbox-label-order: 1; --checkbox-align-items: flex-start;">
				<Checkbox
					checked={singleUse}
					inputId="share-single-use"
					onChange={() => (singleUse = !singleUse)}
					testId={NOTES_SHARE_SINGLE_USE_CHECKBOX}
					text="block"
				>
					<span class="text-sm text-primary">{$i18n.notes.share.text.single_use_option}</span>
				</Checkbox>
			</div>
		</div>

		<!-- A soft grey callout (secondary surface) matching the editor's privacy box
			(NotesPrivacyInfoBox). -->
		<MessageBox icon={shieldIcon} level="plain" styleClass="w-full bg-secondary! text-left">
			<strong>{`${$i18n.notes.text.encrypted_lead} `}</strong
			>{`${$i18n.notes.share.text.protects_body.trimEnd()} `}<ExternalLink
				ariaLabel={$i18n.core.text.learn_more}
				color="blue"
				href={OISY_DOCS_URL}
				iconVisible={false}
			>
				{$i18n.core.text.learn_more}
			</ExternalLink>
		</MessageBox>
	{:else}
		<!-- State B — link ready -->
		<div class="flex flex-col gap-1">
			<span class="font-bold text-primary">{$i18n.notes.share.text.link_ready_title}</span>
			<span class="text-sm text-tertiary">{$i18n.notes.share.text.link_ready_subtitle}</span>
		</div>

		<div class="flex items-center gap-2 rounded-lg border border-brand-subtle-20 py-1 pr-1 pl-3">
			<span class="min-w-0 flex-1 truncate font-mono text-xs text-secondary">{createdLink}</span>
			<Copy
				testId={NOTES_SHARE_LINK_COPY}
				text={$i18n.notes.share.text.link_copied}
				value={createdLink}
			/>
		</div>

		<span class="text-sm text-primary">{recap}</span>
		<span class="text-xs text-tertiary"
			>{replaceOisyPlaceholders($i18n.notes.share.text.reminder)}</span
		>
	{/if}

	{#snippet toolbar()}
		{#if createdLink === undefined}
			<ButtonGroup>
				<ButtonCancel disabled={busy} onclick={onClose} />
				<Button
					colorStyle="primary"
					disabled={atCap || busy}
					loading={busy}
					onclick={onCreate}
					testId={NOTES_SHARE_CREATE_BUTTON}
					type="button"
				>
					{$i18n.notes.share.text.create_link}
				</Button>
			</ButtonGroup>
		{:else}
			<ButtonGroup>
				<Button
					colorStyle="primary"
					fullWidth
					onclick={onClose}
					testId={NOTES_SHARE_DONE_BUTTON}
					type="button"
				>
					{$i18n.notes.share.text.done}
				</Button>
			</ButtonGroup>
		{/if}
	{/snippet}
</ContentWithToolbar>

{#snippet shieldIcon()}
	<div class="min-w-5 py-0 text-success-primary sm:py-0.5">
		<IconShieldCheck size="20" />
	</div>
{/snippet}
