// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ShimejiNFT.sol";
import "../contracts/ShimejiFactory.sol";

contract DeployShimejiFactory is ScaffoldETHDeploy {
    function run(address shimejiNFTAddress) external ScaffoldEthDeployerRunner {
        ShimejiFactory factory = new ShimejiFactory(shimejiNFTAddress, deployer);

        // Transfer NFT ownership to factory so it can mint
        ShimejiNFT(shimejiNFTAddress).transferOwnership(address(factory));
    }
}
