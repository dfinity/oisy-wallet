<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: IcrcCustomToken;

	let disabled = false;
	$: disabled = token.category === 'default';

	let checked: boolean;
	$: checked = token.enabled;

	const dispatch = createEventDispatcher();

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		if (token.indexCanisterVersion === 'outdated') {
			setTimeout(() => {
				checked = !checked;

				toastsShow({
					text: replacePlaceholders($i18n.tokens.manage.info.outdated_index_canister, {
						$token: token.name
					}),
					level: 'info',
					duration: 5000
				});
			}, 500);
			return;
		}

		dispatch('icToken', {
			...token,
			enabled: checked
		});
	};
</script>

<Toggle
	ariaLabel={$i18n.tokens.text.hide_zero_balances}
	{disabled}
	bind:checked
	on:nnsToggle={toggle}
/>
