// /* eslint-disable local-rules/prefer-object-params */
// import { approve as approveToken } from '$eth/services/send.services';
// import type { Erc20Token } from '$eth/types/erc20';
// import type { EthereumNetwork } from '$eth/types/network';
// import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
// import type { ProgressStepsSend } from '$lib/enums/progress-steps';
// import type { EthAddress } from '$lib/types/address';
// import { parseToken } from '$lib/utils/parse.utils';
// import type { Identity } from '@dfinity/agent';
// import { JsonRpcProvider } from '@ethersproject/providers';

// interface CreatePermit2Params {
// 	token: Erc20Token;
// 	from: EthAddress;
// 	identity: Identity;
// 	spender: string; // deltaContract
// 	amount: string; // decimal string
// 	decimals: number;
// 	chainId: number;
// 	deadline: number;
// 	nonce: bigint;
// 	sourceNetwork: EthereumNetwork;
// 	gas?: bigint;
// 	maxFeePerGas?: bigint;
// 	maxPriorityFeePerGas?: bigint;
// 	minterInfo?: OptionCertifiedMinterInfo;
// }

// export const createPermit2WithApproval = async ({
// 	token,
// 	from,
// 	identity,
// 	spender,
// 	amount,
// 	decimals,
// 	chainId,
// 	deadline,
// 	nonce,
// 	sourceNetwork,
// 	gas = 80_000n,
// 	maxFeePerGas = 30_000_000n,
// 	maxPriorityFeePerGas = 1_000_000n,
// 	minterInfo
// }: CreatePermit2Params) => {
// 	const parsedAmount = parseToken({ value: amount, unitName: decimals });

// 	// const newPermit2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

// 	// console.log(newPermit2 === PERMIT2_ADDRESS);

// 	// Optional: check existing allowance to avoid redundant approval
// 	try {
// 		// const provider = new JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`);
// 		// const allowanceProvider = new AllowanceProvider(provider, PERMIT2_ADDRESS);
// 		// const allowance = await allowanceProvider.getAllowanceData(
// 		// 	token.address,
// 		// 	from,
// 		// 	PERMIT2_ADDRESS
// 		// );

// 		// console.log('✅ Permit2 Allowance Info:');
// 		// console.log('  🪙 amount:', allowance.amount.toString());
// 		// console.log('  📅 expiration:', allowance.expiration);
// 		// console.log('  🔢 nonce:', allowance.nonce.toString());

// 		// if (Number(allowance.amount) >= Number(parsedAmount)) {
// 		// 	console.log('✅ Existing Permit2 allowance is sufficient. Skipping approval.');
// 		// } else {
// 		await approveToken({
// 			token,
// 			from,
// 			to: spender,
// 			amount: parsedAmount,
// 			sourceNetwork,
// 			identity,
// 			gas,
// 			maxFeePerGas,
// 			maxPriorityFeePerGas,
// 			minterInfo,
// 			progress: (step: ProgressStepsSend) => {
// 				console.log('🌀 Approve step:', step);
// 			}
// 		});
// 		// }
// 	} catch (e) {
// 		console.log(e);
// 	}

// 	console.log({ spender });

// 	// 2. Build Permit2 payload (Velora expects Permit2 domain to be DeltaContract)
// 	// const permit: PermitTransferFrom = {
// 	// 	permitted: {
// 	// 		token: token.address,
// 	// 		amount
// 	// 	},
// 	// 	spender,
// 	// 	nonce,
// 	// 	deadline
// 	// };

// 	// const permitSingle: PermitSingle = {
// 	// 	details: {
// 	// 		token: token.address,
// 	// 		amount: parsedAmount,
// 	// 		expiration: deadline, // number (timestamp)
// 	// 		nonce // bigint or number
// 	// 	},
// 	// 	spender, // address
// 	// 	sigDeadline: deadline // number (timestamp, deadline for signature)
// 	// };

// 	// const { domain, types, values } = AllowanceTransfer.getPermitData(
// 	// 	permitSingle,
// 	// 	spender, // ✅ Velora expects deltaContract as verifying contract (not PERMIT2_ADDRESS)
// 	// 	chainId
// 	// );

// 	// const digest = _TypedDataEncoder.hash(domain, types, values);
// 	// const rawSignature = await signPrehash({ hash: digest, identity });
// 	// const { r, s, v } = splitSignature(rawSignature);

// 	// // // Step 3: Create compact EIP-2098 signature (64 bytes)
// 	// // const sBig = BigInt(s);
// 	// // const vBig = BigInt(v - 27); // should be 0 or 1
// 	// // const vs = sBig | (vBig << 255n);

// 	// // const vsHex = vs.toString(16);
// 	// // const paddedVsHex = vsHex.length % 2 === 1 ? `0${vsHex}` : vsHex;
// 	// // const vsBytes = zeroPad(arrayify(`0x${paddedVsHex}`), 32);
// 	// // const rBytes = arrayify(r);
// 	// // const compactSig = concat([rBytes, vsBytes]); // 64 bytes

// 	// // // Step 4: Add nonce (uint256) — 32 bytes
// 	// // const nonceHex = permit.nonce.toString(16);
// 	// // const paddedNonceHex = nonceHex.length % 2 === 1 ? `0${nonceHex}` : nonceHex;
// 	// // const nonceBytes = zeroPad(arrayify(`0x${paddedNonceHex}`), 32);

// 	// // // Step 5: Final 96-byte payload
// 	// // const payload = concat([nonceBytes, compactSig]);

// 	// // if (payload.length !== 96) {
// 	// // 	throw new Error(`❌ Invalid payload size: got ${payload.length}, expected 96`);
// 	// // }

// 	// // return hexlify(payload) as `0x${string}`;

// 	// const sBig = BigInt(s);
// 	// const vBig = BigInt(v - 27); // 27 → 0, 28 → 1
// 	// const vs = sBig | (vBig << 255n);
// 	// const rBytes = arrayify(r);
// 	// const vsBytes = zeroPad(arrayify(`0x${vs.toString(16)}`), 32);
// 	// const signatureBytes = concat([rBytes, vsBytes]); // 64 bytes

// 	// const amountBytes = zeroPad(arrayify(Number(amount)), 32);
// 	// const nonceBytes = zeroPad(arrayify(Number(nonce)), 32);
// 	// const expirationBytes = zeroPad(arrayify(deadline), 32);
// 	// const sigDeadlineBytes = zeroPad(arrayify(deadline), 32);

// 	// const payload = concat([
// 	// 	amountBytes,
// 	// 	nonceBytes,
// 	// 	expirationBytes,
// 	// 	sigDeadlineBytes,
// 	// 	signatureBytes // 64 байти
// 	// ]);

// 	// if (payload.length !== 192) {
// 	// 	throw new Error(`❌ Invalid Permit2 Allowance payload size: got ${payload.length}`);
// 	// }

// 	// return hexlify(payload);
// };

// // export const verifyPermit2Allowance = async (
// // 	providerUrl: string,
// // 	token: string,
// // 	owner: string,
// // 	spender: string
// // ): Promise<void> => {
// // 	const provider = new JsonRpcProvider(providerUrl);
// // 	const allowanceProvider = new AllowanceProvider(provider, spender);

// // 	const allowanceData = await allowanceProvider.getAllowanceData(token, owner, spender);

// // 	console.log('✅ Permit2 Allowance Info:');
// // 	console.log('  🪙 amount:', allowanceData.amount.toString());
// // 	console.log('  📅 expiration:', allowanceData.expiration);
// // 	console.log('  🔢 nonce:', allowanceData.nonce.toString());
// // };
