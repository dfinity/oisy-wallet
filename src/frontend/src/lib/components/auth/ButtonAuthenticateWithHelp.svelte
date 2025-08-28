<script lang="ts">
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
	import { signIn } from '$lib/services/auth.services';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		fullWidth?: boolean;
		helpAlignment?: 'inherit' | 'center';
		needHelpLink?: boolean;
	}

	let { fullWidth = false, helpAlignment = 'inherit', needHelpLink = true }: Props = $props();

	const modalId = Symbol();

	const onclick = async () => {
		const { success } = await signIn({ i18n: $i18n });

		if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};
</script>

<div
	class="flex w-full flex-col items-center md:items-start"
	class:md:items-center={helpAlignment === 'center'}
>
	<ButtonAuthenticate {fullWidth} {onclick} />

	<span
		class="mt-4 flex flex-col text-sm text-tertiary"
		class:text-center={helpAlignment === 'center'}
		class:w-full={fullWidth}
	>
		{#if needHelpLink}
			<SigningInHelpLink styleClass="mt-4" testId={AUTH_SIGNING_IN_HELP_LINK} />
		{/if}
	</span>
</div>
