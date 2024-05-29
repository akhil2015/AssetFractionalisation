const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FractionalisationProtocol", function () {
  let FractionalisationProtocol,
    fractionalisationProtocol,
    fractionalisationProtocolAddress;
  let ExampleAsset, exampleAsset, exampleAssetAddress;
  let owner, addr1, addr2;
  let tokenId = 0; // initial token ID to be minted
  let totalSupply = ethers.parseEther("21000000");
  let pricePerToken = ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    ExampleAsset = await ethers.getContractFactory("ExampleAsset");
    exampleAsset = await ExampleAsset.deploy();
    await exampleAsset.waitForDeployment();
    await exampleAsset.safeMint(owner.address);
    // MintableERC20 = await ethers.getContractFactory("MintableERC20");
    // mintableERC20 = await MintableERC20.deploy();
    // await mintableERC20.deployed();

    FractionalisationProtocol = await ethers.getContractFactory(
      "FractionalisationProtocol"
    );
    fractionalisationProtocol = await FractionalisationProtocol.deploy();
    await fractionalisationProtocol.waitForDeployment();

    fractionalisationProtocolAddress =
      await fractionalisationProtocol.getAddress();
    exampleAssetAddress = await exampleAsset.getAddress();
  });

  describe("lockTokenAndFractionalise", function () {
    it("should lock an ERC721 token and mint ERC20 tokens", async function () {
      await exampleAsset.approve(fractionalisationProtocolAddress, tokenId);
      await fractionalisationProtocol.lockTokenAndFractionalise(
        exampleAssetAddress,
        tokenId,
        totalSupply,
        pricePerToken
      );

      const fractionalTokenAddress =
        await fractionalisationProtocol.getFractionalTokenAddress(
          exampleAssetAddress,
          tokenId
        );

      const tokenDetails = await fractionalisationProtocol.tokenDetails(
        fractionalTokenAddress
      );
      expect(tokenDetails.owner).to.equal(owner.address);
      expect(tokenDetails.tokenId).to.equal(tokenId);
      expect(tokenDetails.totalSupply).to.equal(totalSupply);
      expect(tokenDetails.pricePerToken).to.equal(pricePerToken);
      expect(tokenDetails.isLocked).to.be.true;
    });

    it("should fail if the token is already locked", async function () {
      await exampleAsset.approve(fractionalisationProtocolAddress, tokenId);
      await fractionalisationProtocol.lockTokenAndFractionalise(
        exampleAssetAddress,
        tokenId,
        totalSupply,
        pricePerToken
      );
      await expect(
        fractionalisationProtocol.lockTokenAndFractionalise(
          exampleAssetAddress,
          tokenId,
          totalSupply,
          pricePerToken
        )
      ).to.be.revertedWith("Token is already locked");
    });

    it("should fail if the caller is not the owner of the Asset", async function () {
      await exampleAsset
        .connect(owner)
        .approve(fractionalisationProtocolAddress, tokenId);
      await expect(
        fractionalisationProtocol
          .connect(addr2)
          .lockTokenAndFractionalise(
            exampleAssetAddress,
            tokenId,
            totalSupply,
            pricePerToken
          )
      ).to.be.revertedWith("You are not the owner of the Asset");
    });
  });

  describe("buyFractionalTokens", function () {
    beforeEach(async function () {
      await exampleAsset.approve(fractionalisationProtocolAddress, tokenId);
      await fractionalisationProtocol.lockTokenAndFractionalise(
        exampleAssetAddress,
        tokenId,
        totalSupply,
        pricePerToken
      );
    });

    it("should allow users to buy fractional tokens", async function () {
      const numberOfTokens = 10;
      const value = BigInt(numberOfTokens) * pricePerToken;

      const fractionalTokenAddress =
        await fractionalisationProtocol.getFractionalTokenAddress(
          exampleAssetAddress,
          tokenId
        );

      await fractionalisationProtocol
        .connect(addr1)
        .buyFractionalTokens(fractionalTokenAddress, numberOfTokens, { value });

      const tokenDetails = await fractionalisationProtocol.tokenDetails(
        fractionalTokenAddress
      );
      expect(tokenDetails.totalSold).to.equal(numberOfTokens);
    });

    it("should fail if the token is not locked", async function () {
      await exampleAsset.safeMint(owner.address); // mint a new token which is not locked
      await expect(
        fractionalisationProtocol.buyFractionalTokens(exampleAssetAddress, 10, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Token is not locked");
    });

    it("should fail if the sent value is incorrect", async function () {
      const fractionalTokenAddress =
        await fractionalisationProtocol.getFractionalTokenAddress(
          exampleAssetAddress,
          tokenId
        );
      await expect(
        fractionalisationProtocol
          .connect(addr1)
          .buyFractionalTokens(fractionalTokenAddress, 10, {
            value: ethers.parseEther("0.5"),
          })
      ).to.be.revertedWith("Invalid amount");
    });
  });
});
