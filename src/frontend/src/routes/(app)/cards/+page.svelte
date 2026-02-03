<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isEmptyString, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { modalCardConnectOpen } from '$lib/derived/modal.derived';
	import { InMemoryTokenStore, ZebecSuperappApiClient } from '$lib/providers/zebec.providers';
	import { modalStore } from '$lib/stores/modal.store';
	import type { SilverCardSummary } from '$lib/types/zebec';

	const tokens = new InMemoryTokenStore();

	const api = new ZebecSuperappApiClient({
		baseUrl: 'https://api.superapp.zebec.io/',
		tokenStore: tokens
	});

	let connected = $state(false);

	let email = $state('');

	let otp = $state('');

	let invalidEmail = $derived(isEmptyString(email));

	let invalidOtp = $derived(isEmptyString(otp));

	let otpSent = $state(false);

	let cards = $state<SilverCardSummary[] | undefined>();

	const onSenOtp = async () => {
		if (invalidEmail) {
			return;
		}

		await api.sendOtp(email);

		otpSent = true;
	};

	const onVerifyOtp = async () => {
		if (invalidEmail || invalidOtp) {
			return;
		}

		const auth = await api.verifyOtp(email, otp);

		if (auth.nextStep === 'complete_profile') {
			console.log('call PUT /auth/profiles or nullify');
		}

		connected = true;

		modalStore.close();
	};

	const loadCards = async () => {
		if (!connected) {
			return;
		}

		({ cards } = await api.cardsSilver());
	};

	$effect(() => {
		if (connected) {
			untrack(() => loadCards());

			return;
		}

		cards = undefined;
	});
</script>

{#if !connected}
	<Button
		colorStyle="primary"
		fullWidth
		onclick={() => modalStore.openCardConnect(Symbol())}
		paddingSmall
		type="button"
	>
		Connect
	</Button>
{:else if isNullish(cards)}
	No cards loaded yet.
{:else if cards.length === 0}
	No cards found.
{:else}
	<ul>
		{#each cards as { cardType, cardStatus, balance, cardNumber }}
			<li>
				<strong>Type:</strong>
				{cardType} |
				<strong>Status:</strong>
				{cardStatus} |
				<strong>Balance:</strong>
				{balance} |
				<strong>Number:</strong>
				{cardNumber}
			</li>
		{/each}
	</ul>
{/if}

{#if $modalCardConnectOpen}
	<Modal onClose={modalStore.close}>
		{#snippet title()}Connect to Zebec{/snippet}

		<ContentWithToolbar>
			<label class="font-bold" for="email">Email</label>
			<InputText name="email" placeholder="email" bind:value={email} />

			{#if otpSent}
				<label class="font-bold" for="otp">OTP</label>
				<InputText name="otp" placeholder="One Time Password" bind:value={otp} />
			{/if}

			{#snippet toolbar()}
				{#if tokens.noTokens()}
					<Button
						colorStyle="primary"
						disabled={invalidEmail}
						fullWidth
						onclick={onSenOtp}
						paddingSmall
						type="button"
					>
						Send OTP
					</Button>
				{:else}
					<Button
						colorStyle="secondary"
						disabled={invalidEmail}
						fullWidth
						onclick={onSenOtp}
						paddingSmall
						type="button"
					>
						Re-send OTP
					</Button>
					<Button
						colorStyle="primary"
						disabled={invalidEmail}
						fullWidth
						onclick={onVerifyOtp}
						paddingSmall
						type="button"
					>
						Verify OTP
					</Button>
				{/if}
			{/snippet}
		</ContentWithToolbar>
	</Modal>
{/if}
