//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ShimejiNFT.sol";
import "../contracts/ShimejiFactory.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // 1. Deploy NFT contract
        ShimejiNFT nft = new ShimejiNFT(deployer);

        // 2. Deploy Factory with reference to NFT
        ShimejiFactory factory = new ShimejiFactory(address(nft), deployer);

        // 3. Transfer NFT ownership to Factory so it can mint
        nft.transferOwnership(address(factory));
    }
}
