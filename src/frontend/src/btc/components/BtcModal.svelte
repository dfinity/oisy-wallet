<script lang="ts">
	import { getBtcBalance, getBtcUtxos, sendBtc } from '$lib/api/backend.api';
	import { getBtcAddress } from '$lib/api/signer.api';
	import { authStore } from '$lib/stores/auth.store';
	import { Input, Modal } from '@dfinity/gix-components';

	let address: string = 'loading...';
	let balance: bigint | undefined = undefined;
	let utxosCount: number | undefined = undefined;
	let destination: string = '';
	let amount: number | undefined;

	$: {
		const loadAddress = async () => {
			if ($authStore?.identity) {
				try {
					address = await getBtcAddress({
						identity: $authStore.identity,
						network: { regtest: null }
					});
					const utxosResponse = await getBtcUtxos({
						identity: $authStore.identity,
						address,
						network: { regtest: null }
					});
					console.log(utxosResponse);
					utxosCount = utxosResponse.utxos.length;
				} catch (e) {
					address = 'error';
				}
			}
		};
		loadAddress();
	}

	$: {
		const loadBalance = async (address: string) => {
			if ($authStore?.identity) {
				try {
					balance = await getBtcBalance({
						identity: $authStore.identity,
						address,
						network: { regtest: null }
					});
				} catch (e) {
					balance = undefined;
				}
			}
		};

		if (address !== 'loading...' && address !== 'error') {
			loadBalance(address);
		}
	}

	let sending = false;
	const sendSatoshis = async () => {
		if ($authStore?.identity && destination && amount) {
			sending = true;
			await sendBtc({
				identity: $authStore.identity,
				destination,
				amount: BigInt(amount),
				network: { regtest: null }
			});
			sending = false;
		}
	};
</script>

<Modal on:nnsClose>
	<h1 class="mb-6">BTC PoC</h1>

	<div class="flex flex-col gap-4">
		<p>{`Address: ${address}`}</p>

		<p>{`Balance: ${balance ?? 'loading...'}`}</p>

		<p>{`Utxos count: ${utxosCount ?? 'loading...'}`}</p>

		<Input
			name="destination"
			inputType="text"
			required
			bind:value={destination}
			placeholder="Enter address"
			spellcheck={false}
		>
			<span slot="label">Destination address</span>
		</Input>

		<Input
			name="amount"
			inputType="number"
			required
			bind:value={amount}
			placeholder="Enter amount in satoshis"
			spellcheck={false}
		>
			<span slot="label">Amount</span>
		</Input>

		<div>
			<button on:click={sendSatoshis} class="primary" disabled={sending}>Send</button>
		</div>
	</div>
</Modal>
