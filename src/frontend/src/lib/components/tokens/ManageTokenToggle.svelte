<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import type { Erc1155TokenToggleable } from '$eth/types/erc1155-token-toggleable';
	import type { EthereumUserToken } from '$eth/types/erc20-user-token';
	import type { Erc721TokenToggleable } from '$eth/types/erc721-token-toggleable';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import type { ExtTokenToggleable } from '$icp/types/ext-token-toggleable';
	import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

	type TokenToggleable =
		| EthereumUserToken
		| SplTokenToggleable
		| Erc721TokenToggleable
		| Erc1155TokenToggleable
		| ExtTokenToggleable;

	interface Props {
		token: TokenToggleable;
		testIdPrefix?: string;
		onShowOrHideToken: (token: TokenToggleable) => void;
	}

	let {
		token,
		testIdPrefix = MANAGE_TOKENS_MODAL_TOKEN_TOGGLE,
		onShowOrHideToken
	}: Props = $props();

	let disabled = $derived(isDefaultEthereumToken(token));

	let checked = $derived(token.enabled ?? false);

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		onShowOrHideToken({
			...token,
			enabled: checked
		});
	};

	const onClick = () => {};
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div onclick={onClick} role="button">
	<Toggle
		ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
		{disabled}
		testId={`${testIdPrefix}-${token.symbol}-${token.network.id.description}`}
		bind:checked
		on:nnsToggle={toggle}
	/>
</div>
