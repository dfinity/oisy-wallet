<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isIcrcTokenToggleDisabled } from '$lib/utils/token-toggle.utils';

	interface Props {
		token: IcrcCustomToken;
		testIdPrefix?: string;
		onIcToken: (token: IcrcCustomToken) => void;
	}

	let { token, testIdPrefix = MANAGE_TOKENS_MODAL_TOKEN_TOGGLE, onIcToken }: Props = $props();

	let disabled = $derived(isIcrcTokenToggleDisabled(token));

	let checked = $derived(token.enabled);

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		onIcToken({
			...token,
			enabled: checked
		});
	};
</script>

<Toggle
	ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
	{disabled}
	testId={`${testIdPrefix}-${token.symbol}-${token.network.id.description}`}
	bind:checked
	on:nnsToggle={toggle}
/>
