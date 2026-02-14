// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ShimejiNFT.sol";

contract DeployShimejiNFT is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new ShimejiNFT(deployer);
    }
}
