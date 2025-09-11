import { render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

import * as ckethStoreMod from '$icp-eth/stores/cketh.store';
import * as addressDerived from '$lib/derived/address.derived';

import * as infuraMod from '$eth/providers/infura.providers';
import * as infuraGasRestMod from '$eth/rest/infura.rest';
import * as listenerServices from '$eth/services/eth-listener.services';
import * as feeServices from '$eth/services/fee.services';

import * as ethUtils from '$eth/utils/eth.utils';
import * as tokenUtils from '$eth/utils/token.utils';
import * as evmNativeUtils from '$evm/utils/native-token.utils';
import * as networkUtils from '$lib/utils/network.utils';

import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as nftSend from '$eth/services/nft-send.services';
import type { EthFeeContextProps } from '$tests/eth/components/fee/EthFeeContextProps';
import EthFeeContextTestHost from '$tests/eth/components/fee/EthFeeContextTestHost.svelte';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';

describe('EthFeeContext', () => {
	const feeStore = { setFee: vi.fn() };

	const network = ETHEREUM_NETWORK;

	const nativeEthereumToken = ETHEREUM_TOKEN;

	const destination = '0x1111111111111111111111111111111111111111';
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

	const baseProps = {
		observe: true,
		destination,
		amount: 1,
		data: undefined,
		sourceNetwork: network,
		targetNetwork: network,
		nativeEthereumToken,
		sendToken: ETHEREUM_TOKEN,
		sendTokenId: ETHEREUM_TOKEN.id,
		sendNft: undefined
	} as EthFeeContextProps;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(fromAddr));
		vi.spyOn(networkUtils, 'isNetworkICP').mockReturnValue(false);
		vi.spyOn(listenerServices, 'initMinedTransactionsListener').mockReturnValue({
			disconnect: vi.fn()
		});

		vi.spyOn(ethUtils, 'isSupportedEthTokenId').mockReturnValue(false);
		vi.spyOn(evmNativeUtils, 'isSupportedEvmNativeTokenId').mockReturnValue(false);
		vi.spyOn(tokenUtils, 'isSupportedErc20TwinTokenId').mockReturnValue(false);

		vi.spyOn(ckethStoreMod, 'ckEthMinterInfoStore', 'get').mockReturnValue({
			...writable({}),
			reset: vi.fn(),
			reinitialize: vi.fn()
		});

		vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
			getFeeData: async () =>
				await new Promise((resolve) =>
					resolve({
						gasPrice: null,
						maxFeePerGas: 10n,
						maxPriorityFeePerGas: 5n
					})
				),
			safeEstimateGas: async () => await new Promise((resolve) => resolve(0n)),
			estimateGas: async () => await new Promise((resolve) => resolve(0n))
		} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

		vi.spyOn(infuraGasRestMod, 'InfuraGasRest').mockImplementation(
			() =>
				({
					getSuggestedFeeData: async () =>
						await new Promise((resolve) =>
							resolve({
								maxFeePerGas: 12n,
								maxPriorityFeePerGas: 7n
							})
						)
				}) as unknown as infuraGasRestMod.InfuraGasRest
		);

		vi.spyOn(feeServices, 'getEthFeeData').mockReturnValue(21n);
		vi.spyOn(feeServices, 'getCkErc20FeeData').mockResolvedValue(0n);
		vi.spyOn(feeServices, 'getErc20FeeData').mockResolvedValue(0n);

		vi.spyOn(nftSend, 'encodeErc721SafeTransfer').mockReturnValue({
			to: '0x2222222222222222222222222222222222222222',
			data: '0xdeadbeef'
		});
		vi.spyOn(nftSend, 'encodeErc1155SafeTransfer').mockReturnValue({
			to: '0x3333333333333333333333333333333333333333',
			data: '0xfeedbead'
		});
	});

	const renderWith = (props: Partial<typeof baseProps> = {}) =>
		render(EthFeeContextTestHost, { props: { feeStore, props: { ...baseProps, ...props } } });

	it('sets fee for native ETH / EVM-native tokens using max(safeEstimateGas, getEthFeeData)', async () => {
		vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

		const provider = infuraMod.infuraProviders(network.id) as unknown as {
			getFeeData: () => Promise<unknown>;
			safeEstimateGas: (p: feeServices.GetFeeData) => Promise<bigint>;
		};
		vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(25n);

		renderWith();

		await vi.runAllTimersAsync();

		expect(feeStore.setFee).toHaveBeenCalledOnce();

		expect(feeStore.setFee).toHaveBeenCalledWith(
			expect.objectContaining({
				gas: 25n,
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			})
		);
	});

	it('sets fee for ckERC20 twin using getCkErc20FeeData', async () => {
		vi.mocked(tokenUtils.isSupportedErc20TwinTokenId).mockReturnValue(true);
		vi.mocked(feeServices.getCkErc20FeeData).mockResolvedValue(123n);

		renderWith();

		await vi.runAllTimersAsync();

		expect(feeStore.setFee).toHaveBeenCalledOnce();

		expect(feeStore.setFee).toHaveBeenCalledWith(
			expect.objectContaining({
				gas: 123n
			})
		);
	});

	it('sets fee for NFT (ERC-721) by encoding and estimating gas', async () => {
		vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(false);
		vi.mocked(evmNativeUtils.isSupportedEvmNativeTokenId).mockReturnValue(false);
		vi.mocked(tokenUtils.isSupportedErc20TwinTokenId).mockReturnValue(false);

		const nft = mockValidErc721Nft;

		const provider = infuraMod.infuraProviders(network.id) as unknown as {
			estimateGas: (p: feeServices.GetFeeData & { data?: string }) => Promise<bigint>;
		};
		vi.spyOn(provider, 'estimateGas').mockResolvedValue(90n);

		renderWith({
			sendToken: mockValidErc721Token,
			sendTokenId: mockValidErc721Token.id,
			sendNft: nft
		});

		await vi.runAllTimersAsync();

		expect(nftSend.encodeErc721SafeTransfer).toHaveBeenCalledOnce();

		expect(nftSend.encodeErc721SafeTransfer).toHaveBeenCalledWith({
			contractAddress: nft.collection.address,
			from: fromAddr,
			to: destination,
			tokenId: nft.id
		});

		expect(provider.estimateGas).toHaveBeenCalledOnce();

		expect(provider.estimateGas).toHaveBeenCalledWith({
			from: fromAddr,
			to: '0x2222222222222222222222222222222222222222',
			data: '0xdeadbeef'
		});

		expect(feeStore.setFee).toHaveBeenCalledOnce();

		expect(feeStore.setFee).toHaveBeenCalledWith(
			expect.objectContaining({
				gas: 90n
			})
		);
	});

	it('does nothing when no eth address is available', async () => {
		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(undefined));

		renderWith();

		await vi.runAllTimersAsync();

		expect(feeStore.setFee).not.toHaveBeenCalled();
	});
});
