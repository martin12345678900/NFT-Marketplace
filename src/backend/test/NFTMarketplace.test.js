const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);

describe("NFTMarketplace", function () {
  let deployer,
    addr1,
    addr2,
    nft,
    marketplace,
    feePercent = 1,
    URI = "Sample URI";
  beforeEach(async () => {
    const NFT = ethers.getContractFactory("NFT");
    const Marketplace = ethers.getContractFactory("Marketplace");

    [deployer, addr1, addr2] = await ethers.getSigners();

    nft = await (await NFT).deploy();
    marketplace = await (await Marketplace).deploy(feePercent);
  });

  describe("deployment", function () {
    it("should track name and symbol of nft collection", async function () {
      expect(await nft.name()).to.equal("Dapp NFT");
      expect(await nft.symbol()).to.equal("DAPP");
    });

    it("should track feeAcount and feePercent of marketplace collection", async function () {
      expect(await marketplace.feeAccount()).to.equal(deployer.address);
      expect(await marketplace.feePercent()).to.equal(feePercent);
    });
  });

  describe("Minting NFTs", function () {
    it("should trach each mintedNFT", async function () {
      //address1 mints a NFT
      await nft.connect(addr1).mint(URI);
      expect(await nft.tokenCount()).to.equal(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      //expect(await nft.tokenURI(1)).to.equal(URI);

      //address2 mints a NFT
      await nft.connect(addr2).mint(URI);
      expect(await nft.tokenCount()).to.equal(2);
      expect(await nft.balanceOf(addr2.address)).to.equal(1);
    });
  });

  describe("Making NFT Items", function () {
    beforeEach(async function () {
      // address1 mints a NFT
      await nft.connect(addr1).mint(URI);
      // address1 approves marketplace to spend contracts
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
    });

    it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function () {
      expect(
        await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(1))
      )
        .to.emit(marketplace, "Offered")
        .withArgs(1, nft.address, 1, toWei(1), addr1.address);

      // TransferFrom function transfers the nft contract to the marketplace contract, so now the marketplace contract should be owner of the nft contract
      expect(await nft.ownerOf(1)).to.equal(marketplace.address);

      // Item count should be increased
      expect(await marketplace.itemCount()).to.equal(1);

      // Check the fields for created item are correct
      const item = await marketplace.items(1); // getting the item with id of 1 from the mapping
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(nft.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(1));
      expect(item.seller).to.equal(addr1.address);
      expect(item.sold).to.equal(false);
    });
  });

  it("Should fail if the price is set to 0", async function () {
    expect(
      marketplace.connect(addr1).makeItem(nft.address, 1, 0)
    ).to.be.revertedWith("Price must be greater than 0");
  });

  describe("Purchase marketplace items", function () {
    beforeEach(async function () {
      await nft.connect(addr1).mint(URI);

      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);

      await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(2));
    });

    it("Should update item as sold, pay seller, transfer the nft to the buyer, charge fees and emit a bought event", async function () {
      const sellerInitialEthBalance = await addr1.getBalance();
      const feeAcountInitialEthBalance = await deployer.getBalance();

      const totalItemPriceInWei = await marketplace.getTotalPrice(1); // get's the price of the item + the gas fee
      expect(
        await marketplace
          .connect(addr2)
          .purchaseItem(1, { value: totalItemPriceInWei })
      )
        .to.emit(marketplace, "Bought")
        .withArgs(1, nft.address, 1, toWei(2), addr1.address, addr2.address); // value passed here = msg.value

      // after purchasing the item, the item price was added in the seller's balance and the fees price was added in the feeAccount's balance

      const sellerFinalEthBalance = await addr1.getBalance();
      const feeAccountFinalEthBalance = await deployer.getBalance();

      expect(Number(sellerFinalEthBalance)).to.equal(
        Number(sellerInitialEthBalance) + Number(toWei(2))
      );

      expect(Number(feeAccountFinalEthBalance)).to.equal(
        Number(feeAcountInitialEthBalance) +
          (Number(totalItemPriceInWei) - Number(toWei(2))) // that evaluates to the gas fees
      );

      // check if now the owner of the nft is the buyer(addr2)
      expect(await nft.ownerOf(1)).to.equal(addr2.address);

      // check if the sold property set to true
      const firstItem = await marketplace.items(1);
      expect(firstItem.sold).to.equal(true);
    });

    it("Should fail for invalid itemId passed, not enough ether to pay, already sold", async function () {
      const totalItemPriceInWei = await marketplace.getTotalPrice(1);
      const fee = (100 * feePercent) / 100;

      expect(
        marketplace
          .connect(addr2)
          .purchaseItem(2, { value: totalItemPriceInWei })
      ).to.be.revertedWith("Item does not exist");

      expect(
        marketplace
          .connect(addr2)
          .purchaseItem(0, { value: totalItemPriceInWei })
      ).to.be.revertedWith("Item does not exist");

      expect(
        marketplace.connect(addr2).purchaseItem(1, { value: toWei(2) })
      ).to.be.revertedWith(
        "Not enough ether to cover the price and market fee"
      );

      expect(
        marketplace
          .connect(deployer)
          .purchaseItem(1, { value: totalItemPriceInWei })
      ).to.be.revertedWith("Item is already sold");
    });
  });
});
