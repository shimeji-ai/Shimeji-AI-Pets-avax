#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
enum DataKey {
    Admin,
}

#[contract]
pub struct ShimejiEscrowVault;

#[contractimpl]
impl ShimejiEscrowVault {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

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
}
