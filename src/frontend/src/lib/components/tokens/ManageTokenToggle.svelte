<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
	import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
	import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import type { Dip721CustomToken } from '$icp/types/dip721-custom-token';
	import type { ExtCustomToken } from '$icp/types/ext-custom-token';
	import type { IcPunksCustomToken } from '$icp/types/icpunks-custom-token';
	import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SplCustomToken } from '$sol/types/spl-custom-token';

	type TokenToggleable =
		| Erc20CustomToken
		| SplCustomToken
		| Erc721CustomToken
		| Erc1155CustomToken
		| ExtCustomToken
		| Dip721CustomToken
		| IcPunksCustomToken;

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
