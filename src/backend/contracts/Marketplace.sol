// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "../../../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../../../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {
    address payable public immutable feeAccount;
    uint public immutable feePercent;
    uint public itemCount;

    struct NFTItem {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    mapping(uint => NFTItem) public items;

    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be greater than 0");

        itemCount ++;

        _nft.transferFrom(msg.sender, address(this), _tokenId);
        items[itemCount] = NFTItem(
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );

        emit Offered(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender
        );
    }

    function purchaseItem(uint _itemId) external payable nonReentrant { // payable means that the function can send and receive ethers
        uint _totalPrice = getTotalPrice(_itemId);
        NFTItem storage item = items[_itemId]; // storage means it is directly got from the struct above, not in memory declared in the function

        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(msg.value >= _totalPrice, "Not enough ether to cover the price and market fee"); // msg.value is the amount of ether sent to this function
        require(item.sold == false, "Item is already sold");

        item.seller.transfer(item.price); //transfer the item price to the seller's address
        feeAccount.transfer(_totalPrice - item.price); // transfer to the feeAccount the gas fees for the transaction

        // set item sold to true
        item.sold = true;

        // transfer the nft from marketplace to the current buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);

        // emit the bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    function getTotalPrice(uint _itemId) view public returns(uint) {
        return items[_itemId].price * (100 * feePercent) / 100;
    }

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }
}