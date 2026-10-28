<script lang="ts">
	import type { IcToken } from '$icp/types/ic-token';
	import GetTokenActionItem from '$lib/components/get-token/GetTokenActionItem.svelte';
	import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
	import IconlySend from '$lib/components/icons/iconly/IconlySend.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		CYCLES_SEND_OR_TOP_UP,
		CYCLES_SEND_OR_TOP_UP_SEND_BUTTON,
		CYCLES_SEND_OR_TOP_UP_TOP_UP_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		// The TCYCLES token being sent.
		token: IcToken;
		formCancelAction?: 'back' | 'close';
		onSend: () => void;
		onTopUp: () => void;
		onBack: () => void;
		onClose: () => void;
	}

	let { token, formCancelAction = 'back', onSend, onTopUp, onBack, onClose }: Props = $props();
</script>

<ContentWithToolbar testId={CYCLES_SEND_OR_TOP_UP}>
	<div class="flex w-full flex-col gap-2">
		<GetTokenActionItem>
			{#snippet icon()}
				<IconlySend />
			{/snippet}

			{#snippet title()}
				{replacePlaceholders($i18n.cycles_top_up.text.choice_send, { $token: token.symbol })}
			{/snippet}

			{#snippet description()}
				{replacePlaceholders($i18n.cycles_top_up.text.choice_send_description, {
					$token: token.symbol
				})}
			{/snippet}

			{#snippet button()}
				<Button
					onclick={onSend}
					paddingSmall
					styleClass="text-nowrap"
					testId={CYCLES_SEND_OR_TOP_UP_SEND_BUTTON}
				>
					{$i18n.send.text.send}
				</Button>
			{/snippet}
		</GetTokenActionItem>

		<GetTokenActionItem>
			{#snippet icon()}
				<IconFuelPump />
			{/snippet}

			{#snippet title()}
				{$i18n.cycles_top_up.text.title}
			{/snippet}

			{#snippet description()}
				{replacePlaceholders($i18n.cycles_top_up.text.choice_top_up_description, {
					$token: token.symbol
				})}
			{/snippet}

			{#snippet button()}
				<Button
					onclick={onTopUp}
					paddingSmall
					styleClass="text-nowrap"
					testId={CYCLES_SEND_OR_TOP_UP_TOP_UP_BUTTON}
				>
					{$i18n.cycles_top_up.text.top_up}
				</Button>
			{/snippet}
		</GetTokenActionItem>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			{#if formCancelAction === 'back'}
				<ButtonBack fullWidth onclick={onBack} />
			{:else}
				<ButtonCancel fullWidth onclick={onClose} />
			{/if}
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
