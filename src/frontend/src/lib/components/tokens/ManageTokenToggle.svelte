<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import type { Erc1155TokenToggleable } from '$eth/types/erc1155-token-toggleable';
	import { run } from 'svelte/legacy';
	import type { EthereumUserToken } from '$eth/types/erc20-user-token';
	import type { Erc721TokenToggleable } from '$eth/types/erc721-token-toggleable';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

	interface Props {
		token: EthereumUserToken | SplTokenToggleable | Erc721TokenToggleable | Erc1155TokenToggleable;
		testIdPrefix?: string;
	}

	let { token, testIdPrefix = MANAGE_TOKENS_MODAL_TOKEN_TOGGLE }: Props = $props();

	let disabled = $state(false);
	run(() => {
		disabled = isDefaultEthereumToken(token);
	});

	let checked: boolean = $state();
	run(() => {
		checked = token.enabled ?? false;
	});

	const dispatch = createEventDispatcher();

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		dispatch('icShowOrHideToken', {
			...token,
			enabled: checked
		});
	};

	const onClick = () => {};
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div role="button" onclick={onClick}>
	<Toggle
		ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
		{disabled}
		testId={`${testIdPrefix}-${token.symbol}-${token.network.id.description}`}
		bind:checked
		on:nnsToggle={toggle}
	/>
</div>
