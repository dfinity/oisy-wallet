// Proof of concept: the extension talks to a local OISY frontend running against staging
// (`DFX_NETWORK=staging npm run dev -- --port 5175`). Production would pin https://oisy.com here
// and in the manifest's `externally_connectable`.
export const OISY_ORIGIN = 'http://localhost:5175';
export const OISY_REQUEST_URL = `${OISY_ORIGIN}/extension/`;

export const POPUP_WIDTH = 420;
export const POPUP_HEIGHT = 720;

// Sepolia only. Mainnet and every other chain are refused in this proof of concept.
export const ETH_CHAIN_ID = 11155111;
export const ETH_CHAIN_ID_HEX = '0xaa36a7';
export const ETH_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// Solana devnet only.
export const SOL_CHAIN = 'solana:devnet';
export const SOL_RPC_URL = 'https://api.devnet.solana.com';
