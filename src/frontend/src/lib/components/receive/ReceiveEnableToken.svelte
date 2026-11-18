<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { RECEIVE_ENABLE_TOKEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enableReceiveToken } from '$lib/services/receive.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveRoute } from '$lib/types/receive';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		route: ReceiveRoute;
	}

	let { route }: Props = $props();

	let symbol = $derived(getTokenDisplaySymbol(route.creditedToken));

	let enabling = $state(false);
	let failed = $state(false);

	const enable = async () => {
		enabling = true;
		failed = false;

		try {
			const { success } = await enableReceiveToken({
				route,
				identity: $authIdentity,
				i18n: $i18n
			});

			failed = !success;
		} finally {
			enabling = false;
		}
	};
</script>

<p class="mb-4 text-primary">
	{replacePlaceholders($i18n.receive.token.text.enable_info, { $token: symbol })}
</p>

{#if failed}
	<p class="mb-4 text-error-primary" role="alert">
		{replacePlaceholders($i18n.receive.token.text.enable_error, { $token: symbol })}
	</p>
{/if}

<Button
	colorStyle="primary"
	disabled={enabling}
	fullWidth
	loading={enabling}
	onclick={enable}
	testId={RECEIVE_ENABLE_TOKEN_BUTTON}
>
	{enabling
		? $i18n.receive.token.text.enabling
		: replacePlaceholders($i18n.receive.token.text.enable_and_show, { $token: symbol })}
</Button>
