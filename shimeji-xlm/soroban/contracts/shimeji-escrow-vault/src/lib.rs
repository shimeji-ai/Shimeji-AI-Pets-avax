#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
enum DataKey {
    Admin,
    Operator,
}

#[contract]
pub struct ShimejiEscrowVault;

#[contractimpl]
impl ShimejiEscrowVault {
    fn require_admin(env: &Env) -> Address {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        admin
    }

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn set_operator(env: Env, operator: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::Operator, &operator);
    }

    pub fn operator(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Operator)
            .unwrap_or_else(|| panic!("operator not configured"))
    }

    pub fn payout_token(env: Env, caller: Address, token_id: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let operator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Operator)
            .unwrap_or_else(|| panic!("operator not configured"));
        if caller != admin && caller != operator {
            panic!("unauthorized payout caller");
        }

        token::Client::new(&env, &token_id).transfer(&env.current_contract_address(), &to, &amount);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
    };

    #[test]
    fn test_initialize_and_read_admin() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(ShimejiEscrowVault, ());
        let client = ShimejiEscrowVaultClient::new(&env, &contract_id);

        client.initialize(&admin);
        assert_eq!(client.admin(), admin);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(ShimejiEscrowVault, ());
        let client = ShimejiEscrowVaultClient::new(&env, &contract_id);

        client.initialize(&admin);
        client.initialize(&admin);
    }

    #[test]
    fn test_operator_can_payout_token() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let operator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let xlm_issuer = Address::generate(&env);
        let xlm_addr = env.register_stellar_asset_contract_v2(xlm_issuer).address();
        let xlm = TokenClient::new(&env, &xlm_addr);
        let xlm_sac = StellarAssetClient::new(&env, &xlm_addr);

        let contract_id = env.register(ShimejiEscrowVault, ());
        let client = ShimejiEscrowVaultClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_operator(&operator);

        xlm_sac.mint(&contract_id, &500_0000000i128);
        client.payout_token(&operator, &xlm_addr, &recipient, &200_0000000i128);

        assert_eq!(xlm.balance(&contract_id), 300_0000000i128);
        assert_eq!(xlm.balance(&recipient), 200_0000000i128);
    }
}
