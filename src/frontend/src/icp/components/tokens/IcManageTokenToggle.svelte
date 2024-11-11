<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { type IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isIcrcTokenToggleDisabled } from '$lib/utils/token-toggle.utils';

	export let token: IcrcCustomToken;

	let outdated = false;
	$: outdated = token.indexCanisterVersion === 'outdated';

	let disabled = false;
	$: disabled = isIcrcTokenToggleDisabled(token);

	let checked: boolean;
	$: checked = token.enabled;

	const dispatch = createEventDispatcher();

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		dispatch('icToken', {
			...token,
			enabled: checked
		});
	};

	const onClick = () => {
		if (!outdated) {
			return;
		}

		toastsShow({
			text: replacePlaceholders(
				replaceOisyPlaceholders($i18n.tokens.manage.info.outdated_index_canister),
				{
					$token: token.name
				}
			),
			level: 'info',
			duration: 5000
		});
	};
</script>

<!-- svelte-ignore a11y-interactive-supports-focus -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class:outdated role="button" on:click={onClick}>
	<Toggle
		ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
		{disabled}
		bind:checked
		on:nnsToggle={toggle}
	/>
</div>
