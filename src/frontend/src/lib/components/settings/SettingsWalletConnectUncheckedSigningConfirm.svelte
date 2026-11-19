<script lang="ts">
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SETTINGS_UNCHECKED_SIGNING_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onCancel: () => void;
		onConfirm: () => void;
	}

	let { onCancel, onConfirm }: Props = $props();

	// Asked afresh every time the switch is turned on, so it starts unticked and is never remembered.
	let understood = $state(false);

	const inputId = 'settings-unchecked-signing-confirmation';
</script>

<BottomSheetConfirmationPopup {onCancel}>
	{#snippet title()}
		{$i18n.settings.text.unchecked_signing_confirm_title}
	{/snippet}

	{#snippet content()}
		<ContentWithToolbar styleClass="flex flex-col gap-4 px-5 pb-5">
			<p class="m-0">{$i18n.settings.text.unchecked_signing_confirm_body}</p>

			<p class="m-0">{$i18n.settings.text.unchecked_signing_confirm_scam}</p>

			<MessageBox level="error" styleClass="!mb-0">
				{#snippet icon()}
					<Checkbox checked={understood} {inputId} onChange={() => (understood = !understood)} />
				{/snippet}

				<label class="block text-sm leading-snug" for={inputId}>
					{$i18n.settings.text.unchecked_signing_confirm_checkbox}
				</label>
			</MessageBox>

			{#snippet toolbar()}
				<ButtonGroup>
					<ButtonCancel onclick={onCancel} />
					<Button
						colorStyle="error"
						disabled={!understood}
						onclick={onConfirm}
						testId={SETTINGS_UNCHECKED_SIGNING_CONFIRM_BUTTON}
					>
						{$i18n.settings.text.unchecked_signing_turn_on}
					</Button>
				</ButtonGroup>
			{/snippet}
		</ContentWithToolbar>
	{/snippet}
</BottomSheetConfirmationPopup>
