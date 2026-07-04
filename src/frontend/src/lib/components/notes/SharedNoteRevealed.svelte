<script lang="ts">
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import NoteText from '$lib/components/notes/NoteText.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		NOTES_SHARE_RECIPIENT_COPY,
		NOTES_SHARE_RECIPIENT_DONE_BUTTON,
		NOTES_SHARE_RECIPIENT_NOTE,
		NOTES_SHARE_RECIPIENT_REVEALED,
		NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	interface Props {
		note: string;
		singleUse: boolean;
		onDone: () => void;
	}

	let { note, singleUse, onDone }: Props = $props();

	const onCopy = async () => {
		await copyToClipboard({ value: note, text: $i18n.notes.share.recipient.note_copied });
	};
</script>

<div class="flex min-h-0 flex-1 flex-col gap-4" data-tid={NOTES_SHARE_RECIPIENT_REVEALED}>
	<div class="flex flex-col gap-2">
		<h1 class="text-xl font-bold text-primary">{$i18n.notes.share.recipient.revealed_title}</h1>
		{#if singleUse}
			<p class="text-sm text-tertiary" data-tid={NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT}>
				{$i18n.notes.share.recipient.single_use_caveat}
			</p>
		{/if}
	</div>

	<div
		class="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-brand-subtle-20 p-4"
		data-tid={NOTES_SHARE_RECIPIENT_NOTE}
	>
		<NoteText {note} />
	</div>

	<MessageBox icon={shieldIcon} level="info" styleClass="w-full text-left">
		<strong>{`${$i18n.notes.text.encrypted_lead} `}</strong
		>{`${$i18n.notes.text.encrypted_info.trimEnd()} `}<ExternalLink
			ariaLabel={$i18n.core.text.learn_more}
			color="blue"
			href={OISY_DOCS_URL}
			iconVisible={false}
		>
			{$i18n.core.text.learn_more}
		</ExternalLink>
	</MessageBox>

	<ButtonGroup>
		<Button
			colorStyle="secondary-light"
			onclick={onCopy}
			testId={NOTES_SHARE_RECIPIENT_COPY}
			type="button"
		>
			{$i18n.notes.share.recipient.copy_note}
		</Button>
		<Button
			colorStyle="primary"
			onclick={onDone}
			testId={NOTES_SHARE_RECIPIENT_DONE_BUTTON}
			type="button"
		>
			{$i18n.notes.share.text.done}
		</Button>
	</ButtonGroup>
</div>

{#snippet shieldIcon()}
	<div class="min-w-5 py-0 text-success-primary sm:py-0.5">
		<IconShieldCheck size="20" />
	</div>
{/snippet}
