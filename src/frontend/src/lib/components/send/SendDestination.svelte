<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import IconPenLine from '$lib/components/icons/IconPenLine.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	interface Props {
		destination: string;
		invalidDestination?: boolean;
	}
	let { destination, invalidDestination = false }: Props = $props();

	const dispatch = createEventDispatcher();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const onIcSendDestinationStep = () => dispatch('icSendDestinationStep');
</script>

<div class="mb-10 mt-6">
	<div class="font-bold">{$i18n.core.text.to}</div>

	<div
		class="flex items-center rounded-lg border bg-secondary px-2 py-3"
		class:border-tertiary={!invalidDestination}
		class:border-error-solid={invalidDestination}
	>
		<NetworkLogo network={$sendToken.network} />

		<div class="w-full truncate pl-2 pr-4 text-sm sm:text-base">{destination}</div>

		<button
			class="text-brand-primary"
			onclick={onIcSendDestinationStep}
			aria-label={$i18n.core.text.back}
		>
			<IconPenLine />
		</button>
	</div>
</div>
