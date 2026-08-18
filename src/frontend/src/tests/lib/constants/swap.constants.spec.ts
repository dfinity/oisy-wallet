import type { NetworkId } from '$lib/types/network';

describe('swap.constants', () => {
	describe('SUPPORTED_CROSS_SWAP_NETWORKS', () => {
		const loadMatrix = async ({
			oneSec,
			chainFusion
		}: {
			oneSec: boolean;
			chainFusion: boolean;
		}) => {
			vi.resetModules();
			vi.doMock('$env/rest/onesec.env', () => ({ ONESEC_SWAP_ENABLED: oneSec }));
			vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: chainFusion }));

			const [
				{ SUPPORTED_CROSS_SWAP_NETWORKS },
				{ ETHEREUM_NETWORK_ID },
				{ ICP_NETWORK_ID },
				{ BASE_NETWORK_ID }
			] = await Promise.all([
				import('$lib/constants/swap.constants'),
				import('$env/networks/networks.eth.env'),
				import('$env/networks/networks.icp.env'),
				import('$env/networks/networks-evm/networks.evm.base.env')
			]);

			return {
				icpReaches: (networkId: NetworkId) =>
					SUPPORTED_CROSS_SWAP_NETWORKS[ICP_NETWORK_ID].includes(networkId),
				reachesIcp: (networkId: NetworkId) =>
					SUPPORTED_CROSS_SWAP_NETWORKS[networkId].includes(ICP_NETWORK_ID),
				ETHEREUM_NETWORK_ID,
				BASE_NETWORK_ID
			};
		};

		afterEach(() => {
			vi.doUnmock('$env/rest/onesec.env');
			vi.doUnmock('$env/chain-fusion-swap.env');
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
