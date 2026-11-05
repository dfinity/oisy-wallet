import { BTC_CHANGE_DUST_THRESHOLD_SATOSHIS } from '$btc/constants/btc.constants';
import {
	btcAddressToOutputScript,
	buildBtcSendPsbt,
	finalizeSignedBtcPsbt
} from '$btc/utils/btc-psbt.utils';
import { txidStringToUint8Array } from '$icp/utils/btc.utils';
import { ZERO } from '$lib/constants/app.constants';
import { assertNonNullish } from '@dfinity/utils';
import type { BitcoinNetwork, CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { CURVE, getPublicKey, signAsync, Signature } from '@noble/secp256k1';
import {
	address as btcAddressLib,
	networks,
	payments,
	Transaction,
	type Network,
	type Psbt,
	type SignerAsync
} from 'bitcoinjs-lib';

// Sends of an OISY test wallet on mainnet, built and signed by CFS's `btc_caller_send`. The backend's
// validator tests use the same transactions (`src/backend/src/bitcoin/tx_validator.rs`).
const CFS_WALLET_ADDRESS = 'bc1q0zs8e2pk5z6hwlcafvwmv27chxlgen67lklf45';
const CFS_RECIPIENT_ADDRESS = 'bc1q44r2nattvp03mvcw986848l3s8squ88477rusl';

// Mainnet `ac06d89a…a66b`: one input, a payment and change, 141 sats at exactly 1 sat/vB.
const CFS_TX_1_INPUT_HEX =
	'020000000001018529442ced2c047580fe5ad779e9550d52ba7bbd0103989027aabaf8bdd756180100000000ffffffff021027000000000000160014ad46a9f56b605f1db30e29f47a9ff181e00e1cf52e7000000000000016001478a07ca836a0b5777f1d4b1db62bd8b9be8ccf5e0248304502210087ac12803b0d70a44fde5b7cfe0ab5b01ba429c960fadb611d939f3ed3977ecd0220489e7f46f5aaa22ae04cbd40e02ded933154c3a5f457f8725589117f79185c050121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f100000000';
const CFS_TX_1_INPUT_TXID = 'ac06d89a0373f61ee540a1f8c53b3dad77840f723e73d9df0a68bdec9a62a66b';

// Mainnet `994cc112…044c`: four inputs and one output, the whole balance less the fee.
const CFS_TX_4_INPUTS_HEX =
	'0200000000010443169578662fe15cd8205f19601375055b058048870fe50afccbdbcd8fbc2e870000000000ffffffffc84c225b6ce13f05106bf6ed5822a65e5cf44c3b08e0b09761016c9ff46242830000000000ffffffffb5744c734a4751b0551d15c1459c4927ba60fd4ae3f39f6bc4df63f9fb8dd88f0000000000ffffffffab158e354f2e48cf79d5e31d3e5d5c616d98d4b7fdbcd6e60483e13903e3b4420000000000ffffffff010c3c000000000000160014ad46a9f56b605f1db30e29f47a9ff181e00e1cf5024730440220109656d4aae516027a742f575c2ea6d28a45a4944b73e8953cecbd66234b82cc022072cd4f0a433d5e8136e4cb8dd03e4ff99085c393b4afad781d903046a07574b50121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f102483045022100db12f226d52f977cb3022fff241e53e34b184040156cf0a0f9b16782dbc36c4e022076ac3a80950ec5da4e7a0d3bb43e4814d28c6d07e79193c440982240410ca0e00121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f102473044022078158adf3786be93d04c86dc07dd4110db20d41cc3124646ac5e2237298692b202203a80c2114b2dbb5ec4583d0e3274dc6dcde4389de186d334829464cd12ae04be0121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f102483045022100a123608fdafaae44a0389a049e4f15e4fa639c56bfd2e519a3f723ad20b65e1b0220272652bb5d0e0a469ec3ffb12cb03d261ef152d54076624ff3c7f04c04d23d770121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f100000000';
const CFS_TX_4_INPUTS_TXID = '994cc1128da2c3ec858703c21c5abe28c84e54648c3da4cec2e439351cbc044c';

// A UTXO from its displayed (byte-reversed) txid, as a block explorer shows it.
const mainnetUtxo = ({
	txid,
	vout,
	value
}: {
	txid: string;
	vout: number;
	value: bigint;
}): CkBtcMinterDid.Utxo => ({
	outpoint: { txid: txidStringToUint8Array(txid), vout },
	value,
	height: 900_000
});

const CFS_TX_1_INPUT_UTXOS = [
	mainnetUtxo({
		txid: '1856d7bdf8baaa2790980301bd7bba520d55e979d75afe8075042ced2c442985',
		vout: 1,
		value: 38_859n
	})
];

const CFS_TX_4_INPUTS_UTXOS = [
	mainnetUtxo({
		txid: '872ebc8fcddbcbfc0ae50f874880055b05751360195f20d85ce12f6678951643',
		vout: 0,
		value: 9_530n
	}),
	mainnetUtxo({
		txid: '834262f49f6c016197b0e0083b4cf45c5ea62258edf66b10053fe16c5b224cc8',
		vout: 0,
		value: 4_530n
	}),
	mainnetUtxo({
		txid: '8fd88dfbf963dfc46b9ff3e34afd60ba27499c45c1151d55b051474a734c74b5',
		vout: 0,
		value: 1_000n
	}),
	mainnetUtxo({
		txid: '42b4e30339e18304e6d6bcfdb7d4986d615c5d3e1de3d579cf482e4f358e15ab',
		vout: 0,
		value: 859n
	})
];

const withoutWitnesses = (hex: string): string => {
	const transaction = Transaction.fromHex(hex);

	transaction.ins.forEach((input) => {
		input.witness = [];
	});

	return transaction.toHex();
};

const unsignedTransaction = (psbt: Psbt): Transaction =>
	Transaction.fromBuffer(psbt.data.getTransaction());

describe('btc-psbt.utils', () => {
	describe('btcAddressToOutputScript', () => {
		const hash20 = Buffer.alloc(20, 0x11);
		const hash32 = Buffer.alloc(32, 0x22);

		const addressTypes = ['P2PKH', 'P2SH', 'P2WPKH', 'P2WSH', 'P2TR'] as const;

		type AddressType = (typeof addressTypes)[number];

		// P2TR through `toBech32`: `payments.p2tr` needs an ECC library, which the frontend lacks.
		const addressesFor = (network: Network): Record<AddressType, string | undefined> => ({
			P2PKH: payments.p2pkh({ hash: hash20, network }).address,
			P2SH: payments.p2sh({ hash: hash20, network }).address,
			P2WPKH: payments.p2wpkh({ hash: hash20, network }).address,
			P2WSH: payments.p2wsh({ hash: hash32, network }).address,
			P2TR: btcAddressLib.toBech32(hash32, 1, network.bech32)
		});

		const expectedScripts: Record<AddressType, string> = {
			P2PKH: `76a914${hash20.toString('hex')}88ac`,
			P2SH: `a914${hash20.toString('hex')}87`,
			P2WPKH: `0014${hash20.toString('hex')}`,
			P2WSH: `0020${hash32.toString('hex')}`,
			P2TR: `5120${hash32.toString('hex')}`
		};

		const scriptHex = (params: {
			address: string | undefined;
			network: BitcoinNetwork;
		}): string => {
			assertNonNullish(params.address);

			return Buffer.from(btcAddressToOutputScript({ ...params, address: params.address })).toString(
				'hex'
			);
		};

		describe.each([
			{ network: 'mainnet', bitcoinJsNetwork: networks.bitcoin },
			{ network: 'testnet', bitcoinJsNetwork: networks.testnet },
			{ network: 'regtest', bitcoinJsNetwork: networks.regtest }
		] as const)('on $network', ({ network, bitcoinJsNetwork }) => {
			it.each(addressTypes)('builds the standard %s script', (type) => {
				expect(scriptHex({ address: addressesFor(bitcoinJsNetwork)[type], network })).toBe(
					expectedScripts[type]
				);
			});
		});

		it('matches the BIP350 test vectors, P2TR included, without an ECC library', () => {
			expect(
				scriptHex({ address: 'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4', network: 'mainnet' })
			).toBe('0014751e76e8199196d454941c45d1b3a323f1433bd6');
			expect(
				scriptHex({
					address: 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
					network: 'mainnet'
				})
			).toBe('512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
			expect(
				scriptHex({
					address: 'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c',
					network: 'testnet'
				})
			).toBe('5120000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433');
		});

		it.each(addressTypes)('refuses a mainnet %s address on testnet and regtest', (type) => {
			const address = addressesFor(networks.bitcoin)[type];

			expect(() => scriptHex({ address, network: 'testnet' })).toThrow('is not a testnet address');
			expect(() => scriptHex({ address, network: 'regtest' })).toThrow('is not a regtest address');
		});

		it.each(addressTypes)('refuses a testnet %s address on mainnet', (type) => {
			expect(() =>
				scriptHex({ address: addressesFor(networks.testnet)[type], network: 'mainnet' })
			).toThrow('is not a mainnet address');
		});

		it.each(['P2WPKH', 'P2WSH', 'P2TR'] as const)(
			'tells a testnet %s address from a regtest one by its Bech32 prefix',
			(type) => {
				expect(() =>
					scriptHex({ address: addressesFor(networks.testnet)[type], network: 'regtest' })
				).toThrow('is not a regtest address');
				expect(() =>
					scriptHex({ address: addressesFor(networks.regtest)[type], network: 'testnet' })
				).toThrow('is not a testnet address');
			}
		);

		it.each(['P2PKH', 'P2SH'] as const)(
			'accepts a testnet %s address on regtest, which shares its Base58 versions',
			(type) => {
				expect(
					scriptHex({ address: addressesFor(networks.testnet)[type], network: 'regtest' })
				).toBe(expectedScripts[type]);
			}
		);

		it.each([
			// Witness version 1 with a 40-byte program, version 2 and version 16 (BIP350 vectors).
			'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y',
			'bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs',
			'BC1SW50QGDZ25J'
		])('refuses the unsupported segwit address %s', (address) => {
			expect(() => scriptHex({ address, network: 'mainnet' })).toThrow(
				'Unsupported Bitcoin address type'
			);
		});

		it.each(['', 'not-an-address', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdx'])(
			'refuses the invalid address "%s"',
			(address) => {
				expect(() => scriptHex({ address, network: 'mainnet' })).toThrow();
			}
		);
	});

	describe('buildBtcSendPsbt', () => {
		it('lays out a one-input send with change exactly as CFS did', () => {
			const psbt = buildBtcSendPsbt({
				utxos: CFS_TX_1_INPUT_UTXOS,
				outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 10_000n }],
				changeAddress: CFS_WALLET_ADDRESS,
				feeSatoshis: 141n,
				network: 'mainnet'
			});

			const transaction = unsignedTransaction(psbt);

			expect(transaction.toHex()).toBe(withoutWitnesses(CFS_TX_1_INPUT_HEX));
			expect(transaction.getId()).toBe(CFS_TX_1_INPUT_TXID);
		});

		// CFS drops change below its dust threshold, so every fee from 0 to the 547 sats the
		// transaction paid gives the same bytes.
		it.each([ZERO, 300n, 547n])(
			'lays out a four-input send with %s sats of fee exactly as CFS did, dropping the change',
			(feeSatoshis) => {
				const psbt = buildBtcSendPsbt({
					utxos: CFS_TX_4_INPUTS_UTXOS,
					outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 15_372n }],
					changeAddress: CFS_WALLET_ADDRESS,
					feeSatoshis,
					network: 'mainnet'
				});

				const transaction = unsignedTransaction(psbt);

				expect(transaction.toHex()).toBe(withoutWitnesses(CFS_TX_4_INPUTS_HEX));
				expect(transaction.getId()).toBe(CFS_TX_4_INPUTS_TXID);
			}
		);

		it('keeps change of exactly the dust threshold, last, at the change address', () => {
			const changeSatoshis = BTC_CHANGE_DUST_THRESHOLD_SATOSHIS;

			const psbt = buildBtcSendPsbt({
				utxos: CFS_TX_1_INPUT_UTXOS,
				outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 10_000n }],
				changeAddress: CFS_WALLET_ADDRESS,
				feeSatoshis: 38_859n - 10_000n - changeSatoshis,
				network: 'mainnet'
			});

			expect(psbt.txOutputs).toHaveLength(2);
			expect(psbt.txOutputs[1].address).toBe(CFS_WALLET_ADDRESS);
			expect(psbt.txOutputs[1].value).toBe(Number(changeSatoshis));
		});

		it('drops change one sat below the dust threshold', () => {
			const psbt = buildBtcSendPsbt({
				utxos: CFS_TX_1_INPUT_UTXOS,
				outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 10_000n }],
				changeAddress: CFS_WALLET_ADDRESS,
				feeSatoshis: 38_859n - 10_000n - (BTC_CHANGE_DUST_THRESHOLD_SATOSHIS - 1n),
				network: 'mainnet'
			});

			expect(psbt.txOutputs).toHaveLength(1);
			expect(psbt.txOutputs[0].address).toBe(CFS_RECIPIENT_ADDRESS);
		});

		it.each([
			{ network: 'testnet', prefix: 'tb' },
			{ network: 'regtest', prefix: 'bcrt' }
		] as const)(
			'reports $network addresses for a $network send, with the same bytes',
			({ network, prefix }) => {
				// The CFS addresses' programs, on this network: they compile to the same scripts.
				const onNetwork = (mainnetAddress: string): string =>
					btcAddressLib.toBech32(btcAddressLib.fromBech32(mainnetAddress).data, 0, prefix);

				const recipient = onNetwork(CFS_RECIPIENT_ADDRESS);
				const wallet = onNetwork(CFS_WALLET_ADDRESS);

				const psbt = buildBtcSendPsbt({
					utxos: CFS_TX_1_INPUT_UTXOS,
					outputs: [{ destination: recipient, amount: 10_000n }],
					changeAddress: wallet,
					feeSatoshis: 141n,
					network
				});

				expect(psbt.txOutputs.map(({ address }) => address)).toEqual([recipient, wallet]);
				expect(unsignedTransaction(psbt).toHex()).toBe(withoutWitnesses(CFS_TX_1_INPUT_HEX));
			}
		);

		it('gives every input a witnessUtxo with its value and the wallet script', () => {
			const psbt = buildBtcSendPsbt({
				utxos: CFS_TX_4_INPUTS_UTXOS,
				outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 15_372n }],
				changeAddress: CFS_WALLET_ADDRESS,
				feeSatoshis: 547n,
				network: 'mainnet'
			});

			const walletScript = btcAddressLib.toOutputScript(CFS_WALLET_ADDRESS);

			expect(psbt.data.inputs.map(({ witnessUtxo }) => witnessUtxo)).toEqual(
				CFS_TX_4_INPUTS_UTXOS.map(({ value }) => ({ script: walletScript, value: Number(value) }))
			);
		});

		it('pays a P2TR address without an ECC library', () => {
			const p2trAddress = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';

			const psbt = buildBtcSendPsbt({
				utxos: CFS_TX_1_INPUT_UTXOS,
				outputs: [{ destination: p2trAddress, amount: 10_000n }],
				changeAddress: CFS_WALLET_ADDRESS,
				feeSatoshis: 153n,
				network: 'mainnet'
			});

			expect(psbt.txOutputs[0].script.toString('hex')).toBe(
				'512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
			);
		});

		it('throws when the UTXOs do not cover the outputs and the fee', () => {
			expect(() =>
				buildBtcSendPsbt({
					utxos: CFS_TX_1_INPUT_UTXOS,
					outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 38_859n }],
					changeAddress: CFS_WALLET_ADDRESS,
					feeSatoshis: 1n,
					network: 'mainnet'
				})
			).toThrow('do not cover the outputs');
		});

		it('throws on a recipient for another network', () => {
			// The CFS recipient's program, as a testnet address: it compiles to the same script.
			const testnetRecipient = btcAddressLib.toBech32(
				btcAddressLib.fromBech32(CFS_RECIPIENT_ADDRESS).data,
				0,
				'tb'
			);

			expect(() =>
				buildBtcSendPsbt({
					utxos: CFS_TX_1_INPUT_UTXOS,
					outputs: [{ destination: testnetRecipient, amount: 10_000n }],
					changeAddress: CFS_WALLET_ADDRESS,
					feeSatoshis: 141n,
					network: 'mainnet'
				})
			).toThrow('is not a mainnet address');
		});
	});

	describe('finalizeSignedBtcPsbt', () => {
		// Private key 1: its public key is the secp256k1 generator point.
		const privateKey = Uint8Array.from([...Array(31).fill(0), 1]);
		const otherPrivateKey = Uint8Array.from([...Array(31).fill(0), 2]);
		const publicKey = Buffer.from(getPublicKey(privateKey));

		const { address: walletAddress } = payments.p2wpkh({ pubkey: publicKey });
		assertNonNullish(walletAddress);

		const buildPsbt = (): Psbt =>
			buildBtcSendPsbt({
				utxos: CFS_TX_4_INPUTS_UTXOS.slice(0, 2),
				outputs: [{ destination: CFS_RECIPIENT_ADDRESS, amount: 10_000n }],
				changeAddress: walletAddress,
				feeSatoshis: 300n,
				network: 'mainnet'
			});

		// Claims the wallet's public key, so bitcoinjs-lib lets it sign, whichever key it signs with.
		const testSigner = ({
			signingKey = privateKey,
			highS = false
		}: {
			signingKey?: Uint8Array;
			highS?: boolean;
		} = {}): SignerAsync => ({
			publicKey,
			sign: async (hash: Buffer): Promise<Buffer> => {
				const signature = await signAsync(Uint8Array.from(hash), signingKey);

				return Buffer.from(
					(highS
						? new Signature(signature.r, CURVE.n - signature.s)
						: signature
					).toCompactRawBytes()
				);
			}
		});

		const signAllInputs = async ({ psbt, signer }: { psbt: Psbt; signer: SignerAsync }) => {
			await Promise.all(psbt.txInputs.map((_, index) => psbt.signInputAsync(index, signer)));
		};

		it('returns the signed transaction, whose txid is the unsigned one', async () => {
			const psbt = buildPsbt();
			const unsigned = unsignedTransaction(psbt);

			await signAllInputs({ psbt, signer: testSigner() });

			const { txid, hex, bytes } = finalizeSignedBtcPsbt({ psbt });

			const transaction = Transaction.fromHex(hex);

			expect(txid).toBe(unsigned.getId());
			expect(transaction.getId()).toBe(txid);
			expect(Buffer.from(bytes).toString('hex')).toBe(hex);
			expect(withoutWitnesses(hex)).toBe(unsigned.toHex());
			expect(transaction.ins.map(({ witness }) => witness[1])).toEqual([publicKey, publicKey]);
		});

		it('throws on a signature made with another key than the input’s', async () => {
			const psbt = buildPsbt();

			await signAllInputs({ psbt, signer: testSigner({ signingKey: otherPrivateKey }) });

			expect(() => finalizeSignedBtcPsbt({ psbt })).toThrow('does not verify');
		});

		it('throws on a high-S signature', async () => {
			const psbt = buildPsbt();

			await signAllInputs({ psbt, signer: testSigner({ highS: true }) });

			expect(() => finalizeSignedBtcPsbt({ psbt })).toThrow('does not verify');
		});

		it('throws when an input is unsigned', async () => {
			const psbt = buildPsbt();

			await psbt.signInputAsync(0, testSigner());

			expect(() => finalizeSignedBtcPsbt({ psbt })).toThrow();
		});
	});
});
