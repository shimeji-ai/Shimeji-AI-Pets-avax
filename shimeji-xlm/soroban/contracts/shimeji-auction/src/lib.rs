#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, IntoVal, String, Symbol};

#[cfg(test)]
const AUCTION_DURATION: u64 = 604_800; // 7 days in seconds
const MIN_AUCTION_DURATION: u64 = 3_600; // 1 hour
const MAX_AUCTION_DURATION: u64 = 2_592_000; // 30 days
const MIN_INCREMENT_BPS: i128 = 500; // 5% minimum bid increment
const TOKEN_SCALE: i128 = 10_000_000; // 7 decimals

/// Oracle asset descriptor (Reflector protocol).
#[contracttype]
#[derive(Clone)]
pub enum OracleAsset {
    Stellar(Address),
    Other(Symbol),
}

/// Oracle price data returned by Reflector (price is at 10^14 scale).
#[contracttype]
#[derive(Clone)]
pub struct OraclePriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Currency {
    Xlm,
    Usdc,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowProvider {
    Internal,
    TrustlessWork,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AuctionInfo {
    pub token_uri: String,
    pub is_item_auction: bool,
    pub seller: Address,
    pub token_id: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub starting_price: i128,
    pub currency: Currency,
    pub finalized: bool,
    pub escrow_provider: EscrowProvider,
    pub escrow_settled: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BidInfo {
    pub bidder: Address,
    pub amount: i128,
    pub currency: Currency,
}

#[contracttype]
pub enum DataKey {
    Admin,
    NftContract,
    UsdcToken,
    XlmToken,
    EscrowProvider,
    TrustlessEscrowXlm,
    TrustlessEscrowUsdc,
    OracleContract,
    NextAuctionId,
    Auction(u64),
    HighestBid(u64),
}

#[contract]
pub struct ShimejiAuction;

impl ShimejiAuction {
    /// Normalize `amount` in `currency` to USDC equivalent using the Reflector oracle.
    /// Only calls the oracle when `currency` is XLM.
    fn normalize_to_usdc(env: &Env, amount: i128, currency: &Currency) -> i128 {
        match currency {
            Currency::Usdc => amount,
            Currency::Xlm => {
                let rate = Self::get_xlm_usdc_rate(env)
                    .unwrap_or_else(|| panic!("oracle not configured for cross-currency comparison"));
                amount * rate / TOKEN_SCALE
            }
        }
    }

    /// Fetch XLM/USDC rate from Reflector oracle.
    /// Returns XLM price expressed in USDC at TOKEN_SCALE (10^7), or None if no oracle configured.
    fn get_xlm_usdc_rate(env: &Env) -> Option<i128> {
        let oracle: Option<Address> = env.storage().instance().get(&DataKey::OracleContract);
        let oracle = oracle?;
        let asset = OracleAsset::Other(Symbol::new(env, "XLM"));
        let data: Option<OraclePriceData> = env.invoke_contract(
            &oracle,
            &Symbol::new(env, "lastprice"),
            (asset,).into_val(env),
        );
        // Reflector returns price at 10^14 scale; convert to 10^7 by dividing by 10^7
        data.map(|pd| pd.price / TOKEN_SCALE)
    }

    fn require_admin(env: &Env) -> Address {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        admin
    }

    fn current_escrow_provider(env: &Env) -> EscrowProvider {
        env.storage()
            .instance()
            .get(&DataKey::EscrowProvider)
            .unwrap_or(EscrowProvider::Internal)
    }

    fn trustless_escrow_destination(env: &Env, currency: &Currency) -> Address {
        let key = match currency {
            Currency::Xlm => DataKey::TrustlessEscrowXlm,
            Currency::Usdc => DataKey::TrustlessEscrowUsdc,
        };
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("trustless escrow destination not configured"))
    }

    fn nft_contract(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::NftContract).unwrap()
    }

    fn validate_auction_duration(duration_seconds: u64) {
        if duration_seconds < MIN_AUCTION_DURATION {
            panic!("auction duration too short");
        }
        if duration_seconds > MAX_AUCTION_DURATION {
            panic!("auction duration too long");
        }
    }

    fn nft_owner_of(env: &Env, token_id: u64) -> Address {
        let nft_contract = Self::nft_contract(env);
        env.invoke_contract::<Address>(
            &nft_contract,
            &Symbol::new(env, "owner_of"),
            (token_id,).into_val(env),
        )
    }

    fn nft_token_uri(env: &Env, token_id: u64) -> String {
        let nft_contract = Self::nft_contract(env);
        env.invoke_contract::<String>(
            &nft_contract,
            &Symbol::new(env, "token_uri"),
            (token_id,).into_val(env),
        )
    }

    fn nft_transfer(env: &Env, from: &Address, to: &Address, token_id: u64) {
        let nft_contract = Self::nft_contract(env);
        env.invoke_contract::<()>(
            &nft_contract,
            &Symbol::new(env, "transfer"),
            (from.clone(), to.clone(), token_id).into_val(env),
        );
    }
}

#[contractimpl]
impl ShimejiAuction {
    pub fn initialize(env: Env, admin: Address, nft_contract: Address, usdc_token: Address, xlm_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NftContract, &nft_contract);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::EscrowProvider, &EscrowProvider::Internal);
        env.storage().instance().set(&DataKey::TrustlessEscrowXlm, &admin);
        env.storage().instance().set(&DataKey::TrustlessEscrowUsdc, &admin);
        env.storage().instance().set(&DataKey::NextAuctionId, &0u64);
    }

    pub fn configure_oracle(env: Env, oracle: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::OracleContract, &oracle);
    }

    pub fn configure_internal_escrow(env: Env) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::EscrowProvider, &EscrowProvider::Internal);
    }

    pub fn configure_trustless_escrow(env: Env, xlm_destination: Address, usdc_destination: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::TrustlessEscrowXlm, &xlm_destination);
        env.storage().instance().set(&DataKey::TrustlessEscrowUsdc, &usdc_destination);
        env.storage()
            .instance()
            .set(&DataKey::EscrowProvider, &EscrowProvider::TrustlessWork);
    }

    pub fn get_escrow_provider(env: Env) -> EscrowProvider {
        Self::current_escrow_provider(&env)
    }

    pub fn get_trustless_escrow_dests(env: Env) -> (Address, Address) {
        let xlm_destination: Address = env
            .storage()
            .instance()
            .get(&DataKey::TrustlessEscrowXlm)
            .unwrap();
        let usdc_destination: Address = env
            .storage()
            .instance()
            .get(&DataKey::TrustlessEscrowUsdc)
            .unwrap();
        (xlm_destination, usdc_destination)
    }

    pub fn create_item_auction(
        env: Env,
        seller: Address,
        token_id: u64,
        starting_price: i128,
        currency: Currency,
        duration_seconds: u64,
    ) -> u64 {
        seller.require_auth();
        Self::validate_auction_duration(duration_seconds);

        let owner = Self::nft_owner_of(&env, token_id);
        if owner != seller {
            panic!("seller does not own token");
        }

        let token_uri = Self::nft_token_uri(&env, token_id);
        let now = env.ledger().timestamp();
        let auction_id: u64 = env.storage().instance().get(&DataKey::NextAuctionId).unwrap();

        Self::nft_transfer(&env, &seller, &env.current_contract_address(), token_id);

        let auction = AuctionInfo {
            token_uri,
            is_item_auction: true,
            seller: seller.clone(),
            token_id,
            start_time: now,
            end_time: now + duration_seconds,
            starting_price,
            currency,
            finalized: false,
            // Item auctions use the currently configured escrow provider
            // (TrustlessWork when available; Internal otherwise).
            escrow_provider: Self::current_escrow_provider(&env),
            escrow_settled: false,
        };

        env.storage().persistent().set(&DataKey::Auction(auction_id), &auction);
        env.storage().instance().set(&DataKey::NextAuctionId, &(auction_id + 1));
        auction_id
    }

    pub fn bid_xlm(env: Env, auction_id: u64, bidder: Address, amount: i128) {
        bidder.require_auth();
        Self::place_bid(&env, auction_id, bidder, amount, Currency::Xlm);
    }

    pub fn bid_usdc(env: Env, auction_id: u64, bidder: Address, amount: i128) {
        bidder.require_auth();
        Self::place_bid(&env, auction_id, bidder, amount, Currency::Usdc);
    }

    fn place_bid(env: &Env, auction_id: u64, bidder: Address, amount: i128, currency: Currency) {
        let auction: AuctionInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Auction(auction_id))
            .unwrap_or_else(|| panic!("auction does not exist"));

        let now = env.ledger().timestamp();
        if now > auction.end_time {
            panic!("auction has ended");
        }
        if auction.finalized {
            panic!("auction already finalized");
        }

        // Check bid meets the minimum starting price.
        // Same currency → direct comparison; cross-currency → normalize both to USDC via oracle.
        if currency == auction.currency {
            if amount < auction.starting_price {
                panic!("bid below minimum starting price");
            }
        } else {
            let bid_usdc = Self::normalize_to_usdc(env, amount, &currency);
            let starting_usdc = Self::normalize_to_usdc(env, auction.starting_price, &auction.currency);
            if bid_usdc < starting_usdc {
                panic!("bid below minimum starting price");
            }
        }

        // Check against current highest bid.
        // Same currency as highest bid → direct comparison; different → normalize to USDC via oracle.
        let has_existing_bid = env.storage().persistent().has(&DataKey::HighestBid(auction_id));
        if has_existing_bid {
            let current_bid: BidInfo = env
                .storage()
                .persistent()
                .get(&DataKey::HighestBid(auction_id))
                .unwrap();

            if currency == current_bid.currency {
                // Same currency: compare directly
                let min_required = current_bid.amount + (current_bid.amount * MIN_INCREMENT_BPS / 10_000);
                if amount < min_required {
                    panic!("bid must be at least 5% higher than current highest");
                }
            } else {
                // Cross-currency: normalize both to USDC
                let bid_usdc = Self::normalize_to_usdc(env, amount, &currency);
                let current_usdc = Self::normalize_to_usdc(env, current_bid.amount, &current_bid.currency);
                let required_usdc = current_usdc + (current_usdc * MIN_INCREMENT_BPS / 10_000);
                if bid_usdc < required_usdc {
                    panic!("bid must be at least 5% higher than current highest");
                }
            }

            // Refund previous bidder in their original currency
            let token_addr = match current_bid.currency {
                Currency::Xlm => env.storage().instance().get::<DataKey, Address>(&DataKey::XlmToken).unwrap(),
                Currency::Usdc => env.storage().instance().get::<DataKey, Address>(&DataKey::UsdcToken).unwrap(),
            };
            let token_client = token::Client::new(env, &token_addr);
            token_client.transfer(&env.current_contract_address(), &current_bid.bidder, &current_bid.amount);
        }

        // Transfer bid amount to contract
        let token_addr = match currency {
            Currency::Xlm => env.storage().instance().get::<DataKey, Address>(&DataKey::XlmToken).unwrap(),
            Currency::Usdc => env.storage().instance().get::<DataKey, Address>(&DataKey::UsdcToken).unwrap(),
        };
        let token_client = token::Client::new(env, &token_addr);
        token_client.transfer(&bidder, &env.current_contract_address(), &amount);

        let bid = BidInfo {
            bidder,
            amount,
            currency,
        };
        env.storage().persistent().set(&DataKey::HighestBid(auction_id), &bid);
    }

    pub fn finalize(env: Env, auction_id: u64) {
        let mut auction: AuctionInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Auction(auction_id))
            .unwrap_or_else(|| panic!("auction does not exist"));

        let now = env.ledger().timestamp();
        if now <= auction.end_time {
            panic!("auction has not ended yet");
        }
        if auction.finalized {
            panic!("auction already finalized");
        }

        auction.finalized = true;
        env.storage().persistent().set(&DataKey::Auction(auction_id), &auction);

        // If there's a winning bid, mint NFT to winner
        if env.storage().persistent().has(&DataKey::HighestBid(auction_id)) {
            let winning_bid: BidInfo = env
                .storage()
                .persistent()
                .get(&DataKey::HighestBid(auction_id))
                .unwrap();

            if auction.is_item_auction {
                Self::nft_transfer(
                    &env,
                    &env.current_contract_address(),
                    &winning_bid.bidder,
                    auction.token_id,
                );

                let token_addr = match winning_bid.currency {
                    Currency::Xlm => env.storage().instance().get::<DataKey, Address>(&DataKey::XlmToken).unwrap(),
                    Currency::Usdc => env.storage().instance().get::<DataKey, Address>(&DataKey::UsdcToken).unwrap(),
                };
                let token_client = token::Client::new(&env, &token_addr);
                if auction.escrow_provider == EscrowProvider::TrustlessWork {
                    let destination = Self::trustless_escrow_destination(&env, &winning_bid.currency);
                    token_client.transfer(
                        &env.current_contract_address(),
                        &destination,
                        &winning_bid.amount,
                    );
                } else {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &auction.seller,
                        &winning_bid.amount,
                    );
                }

                auction.escrow_settled = true;
                env.storage().persistent().set(&DataKey::Auction(auction_id), &auction);
            } else {
                let nft_contract: Address = env.storage().instance().get(&DataKey::NftContract).unwrap();

                // Cross-contract call to mint NFT
                let mint_args = (winning_bid.bidder.clone(), auction.token_uri.clone());
                env.invoke_contract::<u64>(
                    &nft_contract,
                    &Symbol::new(&env, "mint"),
                    mint_args.into_val(&env),
                );

                if auction.escrow_provider == EscrowProvider::TrustlessWork {
                    let destination = Self::trustless_escrow_destination(&env, &winning_bid.currency);
                    let token_addr = match winning_bid.currency {
                        Currency::Xlm => env.storage().instance().get::<DataKey, Address>(&DataKey::XlmToken).unwrap(),
                        Currency::Usdc => env.storage().instance().get::<DataKey, Address>(&DataKey::UsdcToken).unwrap(),
                    };
                    let token_client = token::Client::new(&env, &token_addr);
                    token_client.transfer(
                        &env.current_contract_address(),
                        &destination,
                        &winning_bid.amount,
                    );
                    auction.escrow_settled = true;
                    env.storage().persistent().set(&DataKey::Auction(auction_id), &auction);
                }
            }
        } else if auction.is_item_auction {
            Self::nft_transfer(
                &env,
                &env.current_contract_address(),
                &auction.seller,
                auction.token_id,
            );
        }
    }

    pub fn withdraw_xlm(env: Env, amount: i128) {
        let admin = Self::require_admin(&env);
        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&env.current_contract_address(), &admin, &amount);
    }

    pub fn withdraw_usdc(env: Env, amount: i128) {
        let admin = Self::require_admin(&env);
        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(&env.current_contract_address(), &admin, &amount);
    }

    pub fn get_auction(env: Env, auction_id: u64) -> AuctionInfo {
        env.storage()
            .persistent()
            .get(&DataKey::Auction(auction_id))
            .unwrap_or_else(|| panic!("auction does not exist"))
    }

    pub fn get_highest_bid(env: Env, auction_id: u64) -> BidInfo {
        env.storage()
            .persistent()
            .get(&DataKey::HighestBid(auction_id))
            .unwrap_or_else(|| panic!("no bids for this auction"))
    }

    pub fn total_auctions(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextAuctionId)
            .unwrap_or(0u64)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        contract,
        contractimpl,
        contracttype,
        testutils::Address as _,
        testutils::Ledger,
        token::{StellarAssetClient, TokenClient},
        Env, String,
    };

    // MockNft — unchanged
    #[contract]
    struct MockNft;

    #[contracttype]
    #[derive(Clone)]
    enum MockNftDataKey {
        NextTokenId,
        Owner(u64),
        TokenUri(u64),
    }

    #[contractimpl]
    impl MockNft {
        pub fn mint(env: Env, to: Address, token_uri: String) -> u64 {
            let next_id: u64 = env
                .storage()
                .instance()
                .get(&MockNftDataKey::NextTokenId)
                .unwrap_or(0u64);
            env.storage()
                .instance()
                .set(&MockNftDataKey::Owner(next_id), &to);
            env.storage()
                .instance()
                .set(&MockNftDataKey::TokenUri(next_id), &token_uri);
            env.storage()
                .instance()
                .set(&MockNftDataKey::NextTokenId, &(next_id + 1));
            next_id
        }

        pub fn owner_of(env: Env, token_id: u64) -> Address {
            env.storage()
                .instance()
                .get(&MockNftDataKey::Owner(token_id))
                .unwrap_or_else(|| panic!("token does not exist"))
        }

        pub fn token_uri(env: Env, token_id: u64) -> String {
            env.storage()
                .instance()
                .get(&MockNftDataKey::TokenUri(token_id))
                .unwrap_or_else(|| panic!("token does not exist"))
        }

        pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
            let owner: Address = env
                .storage()
                .instance()
                .get(&MockNftDataKey::Owner(token_id))
                .unwrap_or_else(|| panic!("token does not exist"));
            if owner != from {
                panic!("not token owner");
            }
            env.storage()
                .instance()
                .set(&MockNftDataKey::Owner(token_id), &to);
        }
    }

    // MockOracle — returns a fixed XLM/USDC rate of $0.10 (rate = 1_000_000 at 10^7 scale).
    // Reflector price at 10^14 scale: 0.10 * 10^14 = 10_000_000_000_000
    #[contract]
    struct MockOracle;

    #[contractimpl]
    impl MockOracle {
        pub fn lastprice(_env: Env, _asset: OracleAsset) -> Option<OraclePriceData> {
            Some(OraclePriceData {
                price: 10_000_000_000_000, // $0.10 per XLM at 10^14 scale
                timestamp: 0,
            })
        }
    }

    struct TestEnv {
        env: Env,
        admin: Address,
        contract_addr: Address,
        client: ShimejiAuctionClient<'static>,
        nft: MockNftClient<'static>,
        xlm: TokenClient<'static>,
        usdc: TokenClient<'static>,
        xlm_sac: StellarAssetClient<'static>,
        usdc_sac: StellarAssetClient<'static>,
    }

    // Rate after oracle conversion: $0.10/XLM → 1_000_000 at 10^7 scale
    // So 500 XLM ≈ 50 USDC
    const START_XLM: i128 = 500_0000000; // 500 XLM (7 decimals)
    const START_USDC: i128 = 50_0000000; // 50 USDC (7 decimals)

    fn setup() -> TestEnv {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        // Register SAC tokens
        let xlm_issuer = Address::generate(&env);
        let usdc_issuer = Address::generate(&env);
        let xlm_addr = env.register_stellar_asset_contract_v2(xlm_issuer).address();
        let usdc_addr = env.register_stellar_asset_contract_v2(usdc_issuer).address();

        let xlm = TokenClient::new(&env, &xlm_addr);
        let usdc = TokenClient::new(&env, &usdc_addr);
        let xlm_sac = StellarAssetClient::new(&env, &xlm_addr);
        let usdc_sac = StellarAssetClient::new(&env, &usdc_addr);

        let nft_contract = env.register(MockNft, ());
        let contract_addr = env.register(ShimejiAuction, ());
        let client = ShimejiAuctionClient::new(&env, &contract_addr);
        let nft = MockNftClient::new(&env, &nft_contract);
        client.initialize(&admin, &nft_contract, &usdc_addr, &xlm_addr);

        TestEnv { env, admin, contract_addr, client, nft, xlm, usdc, xlm_sac, usdc_sac }
    }

    /// Configure the mock oracle so cross-currency bids work in tests.
    fn configure_oracle(t: &TestEnv) {
        let oracle_addr = t.env.register(MockOracle, ());
        t.client.configure_oracle(&oracle_addr);
    }

    fn fund_xlm(t: &TestEnv, to: &Address, amount: i128) {
        t.xlm_sac.mint(to, &amount);
    }

    fn fund_usdc(t: &TestEnv, to: &Address, amount: i128) {
        t.usdc_sac.mint(to, &amount);
    }

    fn mint_nft(t: &TestEnv, to: &Address) -> u64 {
        let uri = String::from_str(&t.env, "ipfs://shimeji-metadata");
        t.nft.mint(to, &uri)
    }

    /// Create a default XLM auction (starting at START_XLM).
    fn create_xlm_auction(t: &TestEnv) -> u64 {
        let token_id = mint_nft(t, &t.admin);
        t.client.create_item_auction(
            &t.admin,
            &token_id,
            &START_XLM,
            &Currency::Xlm,
            &AUCTION_DURATION,
        )
    }

    /// Create a USDC auction (starting at START_USDC).
    fn create_usdc_auction(t: &TestEnv) -> u64 {
        let token_id = mint_nft(t, &t.admin);
        t.client.create_item_auction(
            &t.admin,
            &token_id,
            &START_USDC,
            &Currency::Usdc,
            &AUCTION_DURATION,
        )
    }

    fn configure_trustless(t: &TestEnv, xlm_destination: &Address, usdc_destination: &Address) {
        t.client
            .configure_trustless_escrow(xlm_destination, usdc_destination);
    }

    // ── Happy path ─────────────────────────────────────────────

    #[test]
    fn test_create_item_auction() {
        let t = setup();
        let id = create_xlm_auction(&t);
        assert_eq!(id, 0);
        assert_eq!(t.client.total_auctions(), 1);

        let info = t.client.get_auction(&0);
        assert_eq!(info.starting_price, START_XLM);
        assert_eq!(info.currency, Currency::Xlm);
        assert!(!info.finalized);
        assert_eq!(info.escrow_provider, EscrowProvider::Internal);
        assert!(!info.escrow_settled);
        assert_eq!(info.end_time - info.start_time, AUCTION_DURATION);
    }

    #[test]
    fn test_create_usdc_auction() {
        let t = setup();
        let id = create_usdc_auction(&t);
        assert_eq!(id, 0);
        let info = t.client.get_auction(&0);
        assert_eq!(info.starting_price, START_USDC);
        assert_eq!(info.currency, Currency::Usdc);
    }

    #[test]
    fn test_bid_xlm_happy_path() {
        let t = setup();
        create_xlm_auction(&t);

        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, 600_0000000);

        t.client.bid_xlm(&0, &bidder, &600_0000000);

        let bid = t.client.get_highest_bid(&0);
        assert_eq!(bid.bidder, bidder);
        assert_eq!(bid.amount, 600_0000000);
        assert_eq!(bid.currency, Currency::Xlm);
        // Bidder's XLM was transferred to contract
        assert_eq!(t.xlm.balance(&bidder), 0);
    }

    #[test]
    fn test_bid_usdc_happy_path() {
        let t = setup();
        create_usdc_auction(&t);

        let bidder = Address::generate(&t.env);
        fund_usdc(&t, &bidder, 60_0000000);

        t.client.bid_usdc(&0, &bidder, &60_0000000);

        let bid = t.client.get_highest_bid(&0);
        assert_eq!(bid.bidder, bidder);
        assert_eq!(bid.amount, 60_0000000);
        assert_eq!(bid.currency, Currency::Usdc);
        assert_eq!(t.usdc.balance(&bidder), 0);
    }

    #[test]
    fn test_outbid_refunds_previous_bidder() {
        let t = setup();
        create_xlm_auction(&t);

        let bidder1 = Address::generate(&t.env);
        let bidder2 = Address::generate(&t.env);
        fund_xlm(&t, &bidder1, 600_0000000);
        fund_xlm(&t, &bidder2, 700_0000000);

        t.client.bid_xlm(&0, &bidder1, &600_0000000);
        assert_eq!(t.xlm.balance(&bidder1), 0);

        // Bidder2 outbids — bidder1 should be refunded
        t.client.bid_xlm(&0, &bidder2, &700_0000000);
        assert_eq!(t.xlm.balance(&bidder1), 600_0000000); // refunded
        assert_eq!(t.xlm.balance(&bidder2), 0); // locked in contract

        let bid = t.client.get_highest_bid(&0);
        assert_eq!(bid.bidder, bidder2);
    }

    #[test]
    fn test_cross_currency_outbid() {
        let t = setup();
        configure_oracle(&t);
        create_xlm_auction(&t); // XLM auction at 500 XLM

        // Bidder1 bids 600 XLM (same currency as auction, no oracle needed)
        let bidder1 = Address::generate(&t.env);
        fund_xlm(&t, &bidder1, 600_0000000);
        t.client.bid_xlm(&0, &bidder1, &600_0000000);

        // Bidder2 outbids with 70 USDC (cross-currency: oracle converts)
        // 600 XLM * 0.10 = 60 USDC equivalent; 5% of 60 = 3; min = 63 USDC.
        // 70 USDC > 63 USDC → valid.
        let bidder2 = Address::generate(&t.env);
        fund_usdc(&t, &bidder2, 70_0000000);
        t.client.bid_usdc(&0, &bidder2, &70_0000000);

        // Bidder1 refunded in XLM
        assert_eq!(t.xlm.balance(&bidder1), 600_0000000);
        let bid = t.client.get_highest_bid(&0);
        assert_eq!(bid.bidder, bidder2);
        assert_eq!(bid.currency, Currency::Usdc);
    }

    #[test]
    #[should_panic(expected = "oracle not configured for cross-currency comparison")]
    fn test_cross_currency_bid_without_oracle_panics() {
        let t = setup();
        create_xlm_auction(&t);

        let bidder = Address::generate(&t.env);
        fund_usdc(&t, &bidder, 60_0000000);
        t.client.bid_usdc(&0, &bidder, &60_0000000);
    }

    #[test]
    #[should_panic(expected = "bid below minimum starting price")]
    fn test_cross_currency_first_bid_below_minimum_from_starting_price() {
        let t = setup();
        configure_oracle(&t);
        create_xlm_auction(&t); // 500 XLM => 50 USDC equivalent with mock oracle

        let bidder = Address::generate(&t.env);
        fund_usdc(&t, &bidder, 49_0000000);
        t.client.bid_usdc(&0, &bidder, &49_0000000);
    }

    #[test]
    fn test_cross_currency_first_bid_exact_minimum_from_starting_price() {
        let t = setup();
        configure_oracle(&t);
        create_xlm_auction(&t); // 500 XLM => 50 USDC equivalent with mock oracle

        let bidder = Address::generate(&t.env);
        fund_usdc(&t, &bidder, 50_0000000);
        t.client.bid_usdc(&0, &bidder, &50_0000000);

        let bid = t.client.get_highest_bid(&0);
        assert_eq!(bid.bidder, bidder);
        assert_eq!(bid.amount, 50_0000000);
        assert_eq!(bid.currency, Currency::Usdc);
    }

    #[test]
    fn test_finalize_no_bids() {
        let t = setup();
        create_xlm_auction(&t);

        t.env.ledger().with_mut(|li| {
            li.timestamp += AUCTION_DURATION + 1;
        });

        t.client.finalize(&0);
        let info = t.client.get_auction(&0);
        assert!(info.finalized);
        assert!(!info.escrow_settled);
    }

    #[test]
    fn test_finalize_item_auction_transfers_nft_and_pays_seller() {
        let t = setup();
        create_xlm_auction(&t);

        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, 600_0000000);
        t.client.bid_xlm(&0, &bidder, &600_0000000);

        t.env.ledger().with_mut(|li| {
            li.timestamp += AUCTION_DURATION + 1;
        });

        t.client.finalize(&0);

        let info = t.client.get_auction(&0);
        assert_eq!(info.escrow_provider, EscrowProvider::Internal);
        assert!(info.finalized);
        assert!(info.escrow_settled);
        assert_eq!(t.xlm.balance(&t.contract_addr), 0);
        assert_eq!(t.xlm.balance(&t.admin), 600_0000000);
        assert_eq!(t.nft.owner_of(&0), bidder);
    }

    #[test]
    fn test_item_auction_uses_trustless_config_when_available() {
        let t = setup();
        let xlm_destination = Address::generate(&t.env);
        let usdc_destination = Address::generate(&t.env);
        configure_trustless(&t, &xlm_destination, &usdc_destination);
        create_xlm_auction(&t);

        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, 600_0000000);
        t.client.bid_xlm(&0, &bidder, &600_0000000);
        assert_eq!(t.xlm.balance(&xlm_destination), 0);

        t.env.ledger().with_mut(|li| {
            li.timestamp += AUCTION_DURATION + 1;
        });

        t.client.finalize(&0);

        let info = t.client.get_auction(&0);
        assert_eq!(info.escrow_provider, EscrowProvider::TrustlessWork);
        assert!(info.escrow_settled);
        assert_eq!(t.xlm.balance(&t.contract_addr), 0);
        assert_eq!(t.xlm.balance(&xlm_destination), 600_0000000);
        assert_eq!(t.xlm.balance(&t.admin), 0);
        assert_eq!(t.nft.owner_of(&0), bidder);
    }

    #[test]
    fn test_bid_exactly_at_minimum() {
        let t = setup();
        create_xlm_auction(&t);

        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, START_XLM);

        // Bid exactly at starting price — should succeed
        t.client.bid_xlm(&0, &bidder, &START_XLM);
        assert_eq!(t.client.get_highest_bid(&0).amount, START_XLM);
    }

    // ── Edge cases ─────────────────────────────────────────────

    #[test]
    #[should_panic(expected = "bid below minimum starting price")]
    fn test_bid_below_minimum_xlm() {
        let t = setup();
        create_xlm_auction(&t); // 500 XLM minimum

        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, 400_0000000);
        t.client.bid_xlm(&0, &bidder, &400_0000000); // below 500 XLM min
    }

    #[test]
    #[should_panic(expected = "bid below minimum starting price")]
    fn test_bid_below_minimum_usdc() {
        let t = setup();
        create_usdc_auction(&t); // 50 USDC minimum

        let bidder = Address::generate(&t.env);
        fund_usdc(&t, &bidder, 40_0000000);
        t.client.bid_usdc(&0, &bidder, &40_0000000); // below 50 USDC min
    }

    #[test]
    #[should_panic(expected = "bid must be at least 5% higher")]
    fn test_bid_insufficient_increment() {
        let t = setup();
        create_xlm_auction(&t);

        let bidder1 = Address::generate(&t.env);
        let bidder2 = Address::generate(&t.env);
        fund_xlm(&t, &bidder1, 600_0000000);
        fund_xlm(&t, &bidder2, 610_0000000);

        t.client.bid_xlm(&0, &bidder1, &600_0000000);
        // 5% of 600 = 30, min required = 630. Bidding 610 should fail.
        t.client.bid_xlm(&0, &bidder2, &610_0000000);
    }

    #[test]
    #[should_panic(expected = "auction has ended")]
    fn test_bid_after_auction_ends() {
        let t = setup();
        create_xlm_auction(&t);

        t.env.ledger().with_mut(|li| {
            li.timestamp += AUCTION_DURATION + 1;
        });

        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, 600_0000000);
        t.client.bid_xlm(&0, &bidder, &600_0000000);
    }

    #[test]
    #[should_panic(expected = "auction has not ended yet")]
    fn test_finalize_before_end() {
        let t = setup();
        create_xlm_auction(&t);
        t.client.finalize(&0);
    }

    #[test]
    #[should_panic(expected = "auction already finalized")]
    fn test_double_finalize() {
        let t = setup();
        create_xlm_auction(&t);

        t.env.ledger().with_mut(|li| {
            li.timestamp += AUCTION_DURATION + 1;
        });

        t.client.finalize(&0);
        t.client.finalize(&0); // second finalize should panic
    }

    #[test]
    #[should_panic(expected = "auction does not exist")]
    fn test_bid_nonexistent_auction() {
        let t = setup();
        let bidder = Address::generate(&t.env);
        fund_xlm(&t, &bidder, 600_0000000);
        t.client.bid_xlm(&99, &bidder, &600_0000000);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let t = setup();
        let nft = Address::generate(&t.env);
        let usdc = Address::generate(&t.env);
        let xlm = Address::generate(&t.env);
        t.client.initialize(&t.admin, &nft, &usdc, &xlm);
    }
}
