import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { NEAR_INTENTS_BLOCKCHAIN_MAP } from '$lib/constants/swap.constants';
import type { NetworkId } from '$lib/types/network';

describe('swap.constants', () => {
	describe('NEAR_INTENTS_BLOCKCHAIN_MAP', () => {
		it('maps BTC mainnet to the btc blockchain code', () => {
			expect(NEAR_INTENTS_BLOCKCHAIN_MAP[BTC_MAINNET_NETWORK_ID]).toBe('btc');
		});

		it('maps Solana mainnet to the sol blockchain code', () => {
			expect(NEAR_INTENTS_BLOCKCHAIN_MAP[SOLANA_MAINNET_NETWORK_ID]).toBe('sol');
		});
	});

	describe('SUPPORTED_CROSS_SWAP_NETWORKS', () => {
		const loadMatrix = async ({
			oneSec,
			chainFusion,
			nearIntentsBtc = false
		}: {
			oneSec: boolean;
			chainFusion: boolean;
			nearIntentsBtc?: boolean;
		}) => {
			vi.resetModules();
			vi.doMock('$env/rest/onesec.env', () => ({ ONESEC_SWAP_ENABLED: oneSec }));
			vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: chainFusion }));
			vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
				...(await importOriginal<typeof import('$env/rest/near-intents.env')>()),
				NEAR_INTENTS_BTC_SWAP_ENABLED: nearIntentsBtc
			}));

			const [
				{ SUPPORTED_CROSS_SWAP_NETWORKS },
				{ ETHEREUM_NETWORK_ID },
				{ ICP_NETWORK_ID },
				{ BASE_NETWORK_ID },
				{ BTC_MAINNET_NETWORK_ID },
				{ SOLANA_MAINNET_NETWORK_ID }
			] = await Promise.all([
				import('$lib/constants/swap.constants'),
				import('$env/networks/networks.eth.env'),
				import('$env/networks/networks.icp.env'),
				import('$env/networks/networks-evm/networks.evm.base.env'),
				import('$env/networks/networks.btc.env'),
				import('$env/networks/networks.sol.env')
			]);

			return {
				icpReaches: (networkId: NetworkId) =>
					SUPPORTED_CROSS_SWAP_NETWORKS[ICP_NETWORK_ID].includes(networkId),
				reachesIcp: (networkId: NetworkId) =>
					SUPPORTED_CROSS_SWAP_NETWORKS[networkId].includes(ICP_NETWORK_ID),
				reaches: ({ from, to }: { from: NetworkId; to: NetworkId }) =>
					SUPPORTED_CROSS_SWAP_NETWORKS[from].includes(to),
				ETHEREUM_NETWORK_ID,
				BASE_NETWORK_ID,
				BTC_MAINNET_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID
			};
		};

		afterEach(() => {
			vi.doUnmock('$env/rest/onesec.env');
			vi.doUnmock('$env/chain-fusion-swap.env');
			vi.doUnmock('$env/rest/near-intents.env');
			vi.resetModules();
		});

		it('pairs ICP with Ethereum in both directions when both providers are on', async () => {
			const { icpReaches, reachesIcp, ETHEREUM_NETWORK_ID } = await loadMatrix({
				oneSec: true,
				chainFusion: true
			});

			expect(icpReaches(ETHEREUM_NETWORK_ID)).toBeTruthy();
			expect(reachesIcp(ETHEREUM_NETWORK_ID)).toBeTruthy();
		});

		it('keeps pairing ICP with Ethereum when only Chain Fusion is on', async () => {
			const { icpReaches, reachesIcp, ETHEREUM_NETWORK_ID } = await loadMatrix({
				oneSec: false,
				chainFusion: true
			});

			expect(icpReaches(ETHEREUM_NETWORK_ID)).toBeTruthy();
			expect(reachesIcp(ETHEREUM_NETWORK_ID)).toBeTruthy();
		});

		it('does not open the other EVM chains to ICP when only Chain Fusion is on', async () => {
			const { icpReaches, reachesIcp, BASE_NETWORK_ID } = await loadMatrix({
				oneSec: false,
				chainFusion: true
			});

			expect(icpReaches(BASE_NETWORK_ID)).toBeFalsy();
			expect(reachesIcp(BASE_NETWORK_ID)).toBeFalsy();
		});

		// The ICP pairing belongs to ck conversion, so it exists exactly when Chain
		// Fusion does; NEAR Intents contributes the non-ICP destinations further below.
		it('pairs ICP with Bitcoin in both directions when Chain Fusion is on', async () => {
			const { icpReaches, reachesIcp, BTC_MAINNET_NETWORK_ID } = await loadMatrix({
				oneSec: false,
				chainFusion: true
			});

			expect(icpReaches(BTC_MAINNET_NETWORK_ID)).toBeTruthy();
			expect(reachesIcp(BTC_MAINNET_NETWORK_ID)).toBeTruthy();
		});

		it('does not open Bitcoin to Ethereum without the NEAR Intents BTC flag', async () => {
			const { reaches, BTC_MAINNET_NETWORK_ID, ETHEREUM_NETWORK_ID } = await loadMatrix({
				oneSec: true,
				chainFusion: true
			});

			expect(reaches({ from: BTC_MAINNET_NETWORK_ID, to: ETHEREUM_NETWORK_ID })).toBeFalsy();
			expect(reaches({ from: ETHEREUM_NETWORK_ID, to: BTC_MAINNET_NETWORK_ID })).toBeFalsy();
		});

		it('isolates Bitcoin entirely when no provider reaches it', async () => {
			const { icpReaches, reachesIcp, BTC_MAINNET_NETWORK_ID } = await loadMatrix({
				oneSec: true,
				chainFusion: false
			});

			expect(icpReaches(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
			expect(reachesIcp(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});

		// NEAR Intents opens Bitcoin to its whole map (spec: decided destination set), in
		// both directions, without touching the ICP pairing that belongs to Chain Fusion.
		it('opens Bitcoin to Ethereum and Solana in both directions with the NEAR Intents BTC flag', async () => {
			const { reaches, BTC_MAINNET_NETWORK_ID, ETHEREUM_NETWORK_ID, SOLANA_MAINNET_NETWORK_ID } =
				await loadMatrix({
					oneSec: false,
					chainFusion: false,
					nearIntentsBtc: true
				});

			expect(reaches({ from: BTC_MAINNET_NETWORK_ID, to: ETHEREUM_NETWORK_ID })).toBeTruthy();
			expect(reaches({ from: ETHEREUM_NETWORK_ID, to: BTC_MAINNET_NETWORK_ID })).toBeTruthy();
			expect(reaches({ from: BTC_MAINNET_NETWORK_ID, to: SOLANA_MAINNET_NETWORK_ID })).toBeTruthy();
			expect(reaches({ from: SOLANA_MAINNET_NETWORK_ID, to: BTC_MAINNET_NETWORK_ID })).toBeTruthy();
		});

		it('does not pair Bitcoin with ICP through the NEAR Intents BTC flag alone', async () => {
			const { icpReaches, reachesIcp, BTC_MAINNET_NETWORK_ID } = await loadMatrix({
				oneSec: false,
				chainFusion: false,
				nearIntentsBtc: true
			});

			expect(icpReaches(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
			expect(reachesIcp(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});

		it('keeps the ICP pairing next to the NEAR Intents destinations when both flags are on', async () => {
			const { reachesIcp, reaches, BTC_MAINNET_NETWORK_ID, ETHEREUM_NETWORK_ID } = await loadMatrix(
				{
					oneSec: false,
					chainFusion: true,
					nearIntentsBtc: true
				}
			);

			expect(reachesIcp(BTC_MAINNET_NETWORK_ID)).toBeTruthy();
			expect(reaches({ from: BTC_MAINNET_NETWORK_ID, to: ETHEREUM_NETWORK_ID })).toBeTruthy();
		});

		it('never opens Bitcoin to itself', async () => {
			const { reaches, BTC_MAINNET_NETWORK_ID } = await loadMatrix({
				oneSec: true,
				chainFusion: true,
				nearIntentsBtc: true
			});

			expect(reaches({ from: BTC_MAINNET_NETWORK_ID, to: BTC_MAINNET_NETWORK_ID })).toBeFalsy();
		});

		it('isolates ICP entirely when neither provider is on', async () => {
			const { icpReaches, reachesIcp, ETHEREUM_NETWORK_ID, BASE_NETWORK_ID } = await loadMatrix({
				oneSec: false,
				chainFusion: false
			});

			expect(icpReaches(ETHEREUM_NETWORK_ID)).toBeFalsy();
			expect(reachesIcp(ETHEREUM_NETWORK_ID)).toBeFalsy();
			expect(icpReaches(BASE_NETWORK_ID)).toBeFalsy();
		});

		it('lists Ethereum once when both providers claim it', async () => {
			vi.resetModules();
			vi.doMock('$env/rest/onesec.env', () => ({ ONESEC_SWAP_ENABLED: true }));
			vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: true }));

			const [{ SUPPORTED_CROSS_SWAP_NETWORKS }, { ETHEREUM_NETWORK_ID }, { ICP_NETWORK_ID }] =
				await Promise.all([
					import('$lib/constants/swap.constants'),
					import('$env/networks/networks.eth.env'),
					import('$env/networks/networks.icp.env')
				]);

			const ethereumEntries = SUPPORTED_CROSS_SWAP_NETWORKS[ICP_NETWORK_ID].filter(
				(networkId) => networkId === ETHEREUM_NETWORK_ID
			);

			expect(ethereumEntries).toHaveLength(1);
		});
	});
});
