//! Token standards

pub enum TokenStandard {
    /// Standard for the Internet Computer
    ///
    /// # Used for:
    /// - ICP (native ICP token)
    /// - Cycles (Native stablecoin for execution fees)
    /// - SNS tokens (Standardized DAOs on the Internet Computer)
    /// - Other ICRC-1 ledger deployments on ICP.
    ///
    /// - [ICRC-1 Spec](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/README.md)
    ICRC1,
    /// The protocol used for native Ethereum
    EthNative,
    /// Standard for the Ethereum blockchain
    ///
    /// # Used for:
    /// - Most tokens on ETH and other EVM networks.
    ///
    /// - [ERC20 Spec](https://eips.ethereum.org/EIPS/eip-20)
    ERC20,
    /// Standard for the Ethereum blockchain
    ///
    /// # Used for:
    /// - Most NFTs on ETH and other EVM networks.
    ///
    /// - [ERC721 Spec](https://eips.ethereum.org/EIPS/eip-721)
    ERC721,
    /// Standard for the Ethereum blockchain
    ///
    /// # Used for:
    /// - Both fungible tokens and NFTs on ETH and other EVM networks.
    ///
    /// - [ERC1155 Spec](https://eips.ethereum.org/EIPS/eip-1155)
    ERC1155,
    /// Standard for the Bitcoin blockchain
    ///
    /// # Used for:
    /// - Bitcoin
    ///
    /// - [Invoice Address](https://en.bitcoin.it/wiki/Invoice_address)
    Bitcoin,
    /// Standard for SOL, the Solana native token
    SolNative,
    /// Standard for the Solana blockchain
    ///
    /// # Used for:
    /// - Most tokens on Solana.
    ///
    /// - [Solana Token Guide](https://solana.com/docs/tokens)
    /// - [SPL token documentation](https://spl.solana.com/token)
    ///
    /// Note: It seems that Solana tokens are defined by the library rather than by a
    /// specification, but I may be wrong.
    SPL,
}
