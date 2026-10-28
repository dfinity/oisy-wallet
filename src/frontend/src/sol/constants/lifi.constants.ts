import type { SolAddress } from '$sol/types/address';

// LI.FI's own program, which every Solana route calls once next to its fee transfer (2026-10-22),
// with no account of the user's: it cannot move the user's funds, whatever it does.
export const LIFI_SOLANA_FEE_PROGRAM: SolAddress = '3i5JeuZuUxeKtVysUnwQNGerJP2bSMX9fTFfS4Nxe3Br';

// The first of the two accounts that instruction names. The second is one it only reads and that
// does not sign, bound by that role rather than its address: LI.FI rotates it (`BHwZ…` until
// 2026-10-23, `CnmFYA…` from 2026-10-27, neither holding an account), and with nothing writable and
// no signer, the instruction cannot change any account, whatever it is passed.
export const LIFI_SOLANA_FEE_PROGRAM_CLOCK: SolAddress =
	'SysvarC1ock11111111111111111111111111111111';

// What that instruction's data starts with, and its whole length.
export const LIFI_SOLANA_FEE_PROGRAM_DISCRIMINATOR = 0;
export const LIFI_SOLANA_FEE_PROGRAM_DATA_LENGTH = 9;

// LI.FI's fee wallet on Solana (a system account), paid in SOL for a native source and into its
// associated token account for the source mint otherwise (both verified on chain, 2026-10-22).
export const LIFI_SOLANA_FEE_WALLET: SolAddress = '34FKjAdVcTax2DHqV2XnbXa9J3zmyKcFuFKWbcmgxjgm';

export const JUPITER_V6_PROGRAM: SolAddress = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

// The Anchor discriminators of the Jupiter v6 entrypoints a LI.FI route may call, from the program's
// on-chain IDL (2026-10-22): `route_v2`, the one LI.FI's transactions call, and its shared-accounts
// form, whose arguments are the same behind an `id: u8`.
export const JUPITER_ROUTE_V2_DISCRIMINATOR = 'bb64facc31c4af14';
export const JUPITER_SHARED_ACCOUNTS_ROUTE_V2_DISCRIMINATOR = 'd19853937cfed8e9';

/**
 * The programs a LI.FI Solana route may call, top-level or nested, besides
 * `SOLANA_KNOWN_PROGRAM_ADDRESSES`: LI.FI's fee program, and every venue Jupiter publishes
 * (`/swap/v1/program-id-to-label`, 2026-10-23) that the known list leaves out, plus two internal
 * programs of JupLend AMM's that Jupiter does not publish. Each is an executable account on chain
 * (2026-10-23).
 *
 * Only a pinned top-level instruction can reach them: Jupiter's own route entrypoint, whose minimum
 * output is bound, calls the venues of its route plan by cross-program invocation, and every one of
 * those calls lands here. Live LI.FI routes reached seven programs outside the known list, in 12 of
 * 33 sampled routes (2026-10-23); all are below. A venue Jupiter adds later is refused until it is
 * added here, which only costs that route its LI.FI offer.
 */
export const LIFI_SOLANA_PROGRAM_ADDRESSES: SolAddress[] = [
	LIFI_SOLANA_FEE_PROGRAM, // LI.FI fee

	// Jupiter's venues.
	'DEXYosS6oEGvk8uCDayvwEZz4qEyDJRf9nFgYCaqPMTm', // 1DEX
	'AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6', // Aldrin
	'CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4', // Aldrin V2
	'AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45', // Aquifer
	'Archer8kgiavM61GyusMzaaS2ft5sALtNsD1HxkUPMhy', // Archer
	'B72M6nyCLFgWiJtAN4naUTminMiTmyGcEqQHXwVeRdht', // BinaryFi
	'2DNbzPochEcyCcWMbL4d9S3u9QqQEj5bbe6cSZFvKsbh', // BisonFi Predict
	'BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p', // Bonkswap
	'boop8hVGQGqehUK2iVEMEnMrL5RbjywRzHKBmBE7ry4', // Boop.fun
	'CarrotwivhMpDnm27EHmRLeQ683Z1PufuqEmBZvD282s', // Carrot
	'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR', // Crema
	'H8W3ctz92svYg6mkn1UtGfu2aQr2fnUFHM1RhScEtQDt', // Cropper
	'DNL1tgEj3nJovHw9jtyCCQD3arssCJzkmpDizknwzey4', // Denali
	'DRVSpZ2YUYYKgZP8XtLhAGtT1zYSCKzeHfb4DgRnrgqD', // Deriverse
	'DSwpgjMvXhtGn6BsbqmacdBZyfLj6jSWf3HJpdJtmg6N', // DexLab
	'FLiNTXPwppyoJabCoxc2uiiRygAHpmMXajiDXo2Ub1z', // Flint
	'FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X', // FluxBeam
	'gatorLx9aC1e5ZWAXscv5QRKiLXnLPLXjftVc81h1Hr', // GatorSwap
	'srAMMzfVHVAtgSJc8iH6CfKzuWuUTzLHVCE81QU1rgi', // Gavel
	'GAMMA7meSFWaBXF25oSUgmGRwaW6sCMFLmBNiMSdbHVT', // GooseFX GAMMA
	'Gswppe6ERWKpUTXvRPfXdzHhiCyJvLadVvXGfdpBqcE1', // Guacswap
	'HADRoNbLovyqhCsocfYQYB7QdfCAAinN9HTePvBCVDQ8', // Hadron
	'HEAVENoP2qxoeuF8Dj2oT1GHEnu49U5mJYkdeC8BAX2o', // Heaven
	'treaf4wWBBty3fHdyBpo35Mz84M8k3heKXmjmi9vFt5', // Helium Network
	'HumaXepHnjaRCpjYTokxY4UtaJcmx41prQ8cxGmFC5fn', // Huma
	'HYEXCHtHkBagdStcJCp3xbbb9B7sdMdWXFNj6mdsG4hn', // Hylo Exchange
	'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt', // Invariant
	'jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9', // Jupiter Lend Earn
	'fd3nMFYTQjX1yr5ER8u7tPdHJB7qt8RpDpNtLQX2Br5', // JupiterRfqV2
	'jupZ4m2GqUCJ5iueMfzQf8khFfH31d4XAQt3RzCT9Vd', // JupLend AMM
	'jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC', // JupLend AMM, internal (no published label or IDL)
	'jupnw4B6Eqs7ft6rxpzYLJZYSnrpRgPcr589n5Kv4oc', // JupLend AMM, internal (no published label or IDL)
	'BQEJZUB4CzoT6UhRffoCkqCyqQNrCPCSGHcPEmsdbEsX', // LemmingsFi
	'MSwapi3WhNKMUGm9YrxGhypgUEt7wYQH3ZgG32XoWzH', // M Swap
	'MEME4gfGe6itEpxgM1xaBVmiFF5XuCTc4oVXUE5w56F', // MemeFun
	'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky', // Mercurial
	'FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq', // MetaDAO
	'Bvs46DPFxiFE6YHxLDLD6QAUcmy51FyRVPZJusPxLk3j', // Metric
	'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG', // Moonit
	'obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y', // Obric V2
	'HBVw6bZtcCaezhcBrmfyXBSBRWCdv72271xQ4GPvms2z', // Obsidian
	'omnixgS8fnqHfCcTGKWj6JtKjzpJZ1Y5y9pyFkQDkYE', // Omnipair
	'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb', // OpenBook V2
	'PSwapMdSai8tjrEXcxFeQth87xC4rRsa4VA5mhGhXkP', // Penguin
	'NUMERUNsFCP3kuNmWZuXtm1AaQCPj9uw6Guv2Ekoi5P', // Perena
	'save8RQVPMWNTzU18t3GBvBkN9hT7jsGjiCQ28FpD9H', // Perena Star V2
	'PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu', // Perps
	'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY', // Phoenix
	'QUayE6nexQWYNZAEqfN8FxoNwQDSu3CAzT2qq9J1ArG', // Quay
	'riptK81hDxhe5pW5jSzSM9iRA8azgEgLJ4dXkPtBS7j', // Riptide
	'runnrXXdsSRkdueCRYxKDvSWfv6nAnrG5dcM29qj1HA', // RunnerRodeo
	'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ', // Saber
	'DecZY86MU5Gj7kppfUCEmd4LbXXuyZH1yHaP2NTqdiZB', // Saber (Decimals)
	'SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY', // Sanctum
	'SPMBzsVUuoHA4Jm6KunbsotaahvVikZs1JyTW6iJvbn', // Sanctum
	'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy', // Sanctum
	'stkitrT1Uoy18Dk1fTrgPw8W6MVzoCfYoAFT4MLsmhq', // Sanctum
	'5ocnV1qiCgaQR8Jb8xWnVbApfaygJ8tNoZfgPwsgx9kx', // Sanctum Infinity
	'pegVkBpfR9GFi5Jaa9YXAHACyM9CzCNvhc5bf8GWNyW', // Sanctum Prop S
	'so1f7APRw5pJ5iNJrM9g5X9tQgXzk8kMUnXxDNdt99b', // Sanctum SOLS
	'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr', // Saros
	'1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE', // Saros DLMM
	'SCALEwAvEK5gtkdHiFzXfPgtk2YwJxPDzaV3aDmR7tA', // Scale Amm
	'SCALEWoRSpVZpMRqHEcDfNvBh3nUSe34jDr9r689gLa', // Scale Vmm
	'endoLNCKTqDn8gSVnN2hDdpgACUPWHZTwoYnnMybpAT', // Solayer
	'SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe', // SolFi
	'6dMXqGZ3ga2dikrYS9ovDXgHGh5RUsb2RTUj6hrQXhk6', // Stabble CLMM
	'swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ', // Stabble Stable Swap
	'swapFpHZwjELNnjvThjajtiVmkz3yPQEHjLtka2fwHW', // Stabble Weighted Swap
	'ghosty4ZU1Qk1HN7Ymz4pZ15QfspzJZgSYFkdKN6ZLK', // Stableswap
	'Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j', // StepN
	'9VX8EKBg6vM6tA68xaDsPkbrx26XConZjkQmhVApUptc', // TaurusFi
	'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8', // Token Swap
	'8ZoPDsvLWXthQaZz6aJJEWNFBZKk2ePuygi6LHT7F7Hh', // Trench
	'CURVEmPpijXDTNdqrA9PGP1io2rkgiVXH26xdXVGLLfz', // Trends
	'2rU1oCHtQ7WJUvy15tKtFvxdYNNSc3id7AzUcjeFSddo', // VaultLiquidUnstake
	'5U3EU2ubXtK84QcRjWVmYt9RaDyA8gKxdUrPFXmZyaki', // Virtuals
	'vVoLTRjQmtFpiYoegx285Ze4gsLJ8ZxgFKVcuvmG1a8', // Voltr
	'FW6zUqn4iKRaeopwwhwsquTY6ABWLLgjxtrC3VPnaWBf', // WhaleStreet
	'WooFif76YGRNjk1pA8wCsN67aQsD9f9iLsz4NcJ1AVb', // Woofi
	'StaKE6XNKVVhG8Qu9hDJBqCW3eRe7MDGLz17nJZetLT' // XOrca
];
