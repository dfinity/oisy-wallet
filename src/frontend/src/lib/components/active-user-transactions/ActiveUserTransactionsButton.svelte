<script lang="ts">
	import ActiveUserTransactionsList from '$lib/components/active-user-transactions/ActiveUserTransactionsList.svelte';
	import AnimatedIconLoader from '$lib/components/icons/animated/AnimatedIconLoader.svelte';
	import IconBell from '$lib/components/icons/lucide/IconBell.svelte';
	import IconBellDot from '$lib/components/icons/lucide/IconBellDot.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import {
		activeUserTransactionsHasUnseen,
		activeUserTransactionsList,
		activeUserTransactionsPending
	} from '$lib/derived/active-user-transactions.derived';
	import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible?: boolean;
	}

	let { visible = $bindable(false) }: Props = $props();

	let button = $state<HTMLButtonElement | undefined>();
	let wasVisible = $state(false);

	// Mark seen on close, not open, so dots stay visible while the user reads.
	$effect(() => {
		if (wasVisible && !visible) {
			activeUserTransactionsStore.markAllSeen();
		}
		wasVisible = visible;
	});

	const hasPending = $derived($activeUserTransactionsPending.length > 0);
	const hasUnseen = $derived($activeUserTransactionsHasUnseen);
	const visibleButton = $derived($activeUserTransactionsList.length > 0);

	$effect(() => {
		if (!visibleButton && visible) {
			visible = false;
		}
	});
</script>

{#if visibleButton}
	<div class="relative">
		<ButtonIcon
			ariaLabel={$i18n.active_user_transactions.text.open_aria_label}
			colorStyle="tertiary-alt"
			expanded={visible}
			link={false}
			onclick={() => (visible = true)}
			bind:button
		>
			{#snippet icon()}
				{#if hasPending}
					<AnimatedIconLoader />
				{:else if hasUnseen}
					<IconBellDot />
				{:else}
					<IconBell />
				{/if}
			{/snippet}

			{$i18n.active_user_transactions.text.button_label}
		</ButtonIcon>

		<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
			<div class="max-w-[28rem] min-w-[24rem]">
				<ActiveUserTransactionsList />
			</div>
		</Popover>
	</div>
{/if}
