// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ShimejiNFT.sol";

contract ShimejiFactory is Ownable {
    ShimejiNFT public shimejiNFT;
    uint256 public mintPrice = 0.001 ether;

    constructor(address _shimejiNFT, address initialOwner) Ownable(initialOwner) {
        shimejiNFT = ShimejiNFT(_shimejiNFT);
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    function buy(string memory tokenURI) external payable {
        require(msg.value >= mintPrice, "Insufficient payment");
        shimejiNFT.mint(msg.sender, tokenURI);
    }

    function withdraw() external onlyOwner {
        (bool success,) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
