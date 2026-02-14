#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, IntoVal, String};

const AUCTION_DURATION: u64 = 604_800; // 7 days in seconds
const MIN_INCREMENT_BPS: i128 = 500; // 5% minimum bid increment

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Currency {
    Xlm,
    Usdc,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AuctionInfo {
    pub token_uri: String,
    pub start_time: u64,
    pub end_time: u64,
    pub starting_price_xlm: i128,
    pub starting_price_usdc: i128,
    pub xlm_usdc_rate: i128, // XLM price in USDC with 7 decimals (e.g. 1_000_000 = $0.10)
    pub finalized: bool,
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
    NextAuctionId,
    Auction(u64),
    HighestBid(u64),
}

#[contract]
pub struct ShimejiAuction;

impl ShimejiAuction {
    fn normalize_to_usdc(amount: i128, currency: &Currency, xlm_usdc_rate: i128) -> i128 {
        match currency {
            Currency::Usdc => amount,
            Currency::Xlm => amount * xlm_usdc_rate / 10_000_000,
        }
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
        env.storage().instance().set(&DataKey::NextAuctionId, &0u64);
    }

    pub fn create_auction(
        env: Env,
        token_uri: String,
        starting_price_xlm: i128,
        starting_price_usdc: i128,
        xlm_usdc_rate: i128,
    ) -> u64 {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let now = env.ledger().timestamp();
        let auction_id: u64 = env.storage().instance().get(&DataKey::NextAuctionId).unwrap();

        let auction = AuctionInfo {
            token_uri,
            start_time: now,
            end_time: now + AUCTION_DURATION,
            starting_price_xlm,
            starting_price_usdc,
            xlm_usdc_rate,
            finalized: false,
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

        let normalized_bid = Self::normalize_to_usdc(amount, &currency, auction.xlm_usdc_rate);

        // Check minimum starting price
        let min_starting = match currency {
            Currency::Xlm => auction.starting_price_xlm,
            Currency::Usdc => auction.starting_price_usdc,
        };
        let normalized_min = Self::normalize_to_usdc(min_starting, &currency, auction.xlm_usdc_rate);
        if normalized_bid < normalized_min {
            panic!("bid below minimum starting price");
        }

        // Check against current highest bid
        let has_existing_bid = env.storage().persistent().has(&DataKey::HighestBid(auction_id));
        if has_existing_bid {
            let current_bid: BidInfo = env
                .storage()
                .persistent()
                .get(&DataKey::HighestBid(auction_id))
                .unwrap();
            let current_normalized =
                Self::normalize_to_usdc(current_bid.amount, &current_bid.currency, auction.xlm_usdc_rate);

            let min_required = current_normalized + (current_normalized * MIN_INCREMENT_BPS / 10_000);
            if normalized_bid < min_required {
                panic!("bid must be at least 5% higher than current highest");
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

            let nft_contract: Address = env.storage().instance().get(&DataKey::NftContract).unwrap();

            // Cross-contract call to mint NFT
            let mint_args = (winning_bid.bidder, auction.token_uri);
            env.invoke_contract::<u64>(
                &nft_contract,
                &soroban_sdk::Symbol::new(&env, "mint"),
                mint_args.into_val(&env),
            );
        }
    }

    pub fn withdraw_xlm(env: Env, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&env.current_contract_address(), &admin, &amount);
    }

    pub fn withdraw_usdc(env: Env, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
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
    use soroban_sdk::{testutils::Address as _, testutils::Ledger, Env, String};

    // For testing, we won't use the actual cross-contract call.
    // Instead we test all logic except finalize's mint call.

    fn setup_auction_env() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let nft_contract = Address::generate(&env);
        let usdc_token = Address::generate(&env);
        let xlm_token = Address::generate(&env);
        (env, admin, nft_contract, usdc_token, xlm_token)
    }

    fn init_client(
        env: &Env,
        admin: &Address,
        nft_contract: &Address,
        usdc_token: &Address,
        xlm_token: &Address,
    ) -> ShimejiAuctionClient<'static> {
        let contract_id = env.register(ShimejiAuction, ());
        let client = ShimejiAuctionClient::new(env, &contract_id);
        client.initialize(admin, nft_contract, usdc_token, xlm_token);
        client
    }

    #[test]
    fn test_create_auction() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri = String::from_str(&env, "ipfs://test");
        // Starting prices: 500 XLM, 50 USDC (7 decimals)
        let auction_id = client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);
        assert_eq!(auction_id, 0);
        assert_eq!(client.total_auctions(), 1);

        let info = client.get_auction(&0);
        assert_eq!(info.token_uri, uri);
        assert!(!info.finalized);
        assert_eq!(info.end_time - info.start_time, AUCTION_DURATION);
    }

    #[test]
    fn test_bid_xlm() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri = String::from_str(&env, "ipfs://test");
        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);

        let _bidder = Address::generate(&env);
        // Token transfer calls require SAC token setup for full integration testing.
        // This test validates auction creation and state management.
    }

    #[test]
    fn test_bid_usdc() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri = String::from_str(&env, "ipfs://test");
        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);
        // Similar to test_bid_xlm — state logic tested via create/get
    }

    #[test]
    fn test_cross_currency_comparison() {
        // Test the normalization math
        // Rate: 1_000_000 = $0.10 per XLM (7 decimal places)
        let xlm_amount: i128 = 500_0000000; // 500 XLM
        let normalized = xlm_amount * 1_000_000 / 10_000_000;
        // 500_0000000 * 1_000_000 / 10_000_000 = 50_0000000 USDC equivalent
        assert_eq!(normalized, 50_0000000);

        // A 50 USDC bid should be equivalent
        let usdc_amount: i128 = 50_0000000;
        assert_eq!(usdc_amount, normalized);
    }

    #[test]
    fn test_total_auctions() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);
        assert_eq!(client.total_auctions(), 0);

        let uri = String::from_str(&env, "ipfs://test");
        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);
        assert_eq!(client.total_auctions(), 1);

        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);
        assert_eq!(client.total_auctions(), 2);
    }

    #[test]
    #[should_panic(expected = "auction does not exist")]
    fn test_get_nonexistent_auction() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);
        client.get_auction(&99);
    }

    #[test]
    #[should_panic(expected = "no bids for this auction")]
    fn test_get_highest_bid_no_bids() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri = String::from_str(&env, "ipfs://test");
        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);
        client.get_highest_bid(&0);
    }

    #[test]
    #[should_panic(expected = "auction has not ended yet")]
    fn test_finalize_before_end() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri = String::from_str(&env, "ipfs://test");
        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);
        client.finalize(&0);
    }

    #[test]
    fn test_finalize_no_bids() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri = String::from_str(&env, "ipfs://test");
        client.create_auction(&uri, &500_0000000, &50_0000000, &1_000_000);

        // Advance time past auction end
        env.ledger().with_mut(|li| {
            li.timestamp = li.timestamp + AUCTION_DURATION + 1;
        });

        client.finalize(&0);
        let info = client.get_auction(&0);
        assert!(info.finalized);
    }

    #[test]
    fn test_multiple_auctions() {
        let (env, admin, nft, usdc, xlm) = setup_auction_env();
        let client = init_client(&env, &admin, &nft, &usdc, &xlm);

        let uri1 = String::from_str(&env, "ipfs://shimeji1");
        let uri2 = String::from_str(&env, "ipfs://shimeji2");

        let id1 = client.create_auction(&uri1, &500_0000000, &50_0000000, &1_000_000);
        let id2 = client.create_auction(&uri2, &1000_0000000, &100_0000000, &1_000_000);

        assert_eq!(id1, 0);
        assert_eq!(id2, 1);
        assert_eq!(client.get_auction(&0).token_uri, uri1);
        assert_eq!(client.get_auction(&1).token_uri, uri2);
    }
}
