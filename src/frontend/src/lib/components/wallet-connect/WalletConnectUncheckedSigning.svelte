<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE,
		WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS,
		WALLET_CONNECT_UNCHECKED_SIGNING_POINTER
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		// Whether the Settings switch was on when the review opened. With it, the refusal above can be
		// signed past once the box is ticked; without it, the review says where the switch is.
		offered: boolean;
		acknowledged: boolean;
		onAcknowledge: () => void;
		onOpenSettings: () => void;
	}

	let { offered, acknowledged, onAcknowledge, onOpenSettings }: Props = $props();

	const inputId = 'wallet-connect-unchecked-signing-acknowledgement';
</script>

{#if offered}
	<!-- An error, not a warning: what the box agrees to is signing a transaction nobody described. -->
	<MessageBox level="error" testId={WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE}>
		{#snippet icon()}
			<Checkbox checked={acknowledged} {inputId} onChange={onAcknowledge} />
		{/snippet}

		<label class="block text-sm leading-snug" for={inputId}>
			{$i18n.wallet_connect.text.unchecked_signing_acknowledge}
		</label>
	</MessageBox>
{:else}
	<div
		class="mb-4 flex flex-col items-start gap-1 text-sm"
		data-tid={WALLET_CONNECT_UNCHECKED_SIGNING_POINTER}
	>
		<p class="m-0 text-tertiary">{$i18n.wallet_connect.text.unchecked_signing_pointer}</p>

		<Button link onclick={onOpenSettings} testId={WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS}>
			{$i18n.wallet_connect.text.unchecked_signing_open_settings}
		</Button>
	</div>
{/if}
