const { expect } = require("chai");
const { ethers } = require("hardhat");
const { expectRevert } = require("@openzeppelin/test-helpers");

describe("Reward Tests", function () {
  let BountyMaker;
  let bountymaker;
  let accounts;
  let onwer;
  let USDC;
  let usdc;
  beforeEach(async function () {
    // Get the contract instance
    [onwer, ...accounts] = await ethers.getSigners();
    USDC = await ethers.getContractFactory("USDC");
    usdc = await USDC.deploy();
    await usdc.deployed();

    BountyMaker = await ethers.getContractFactory("BountyMaker");
    bountymaker = await BountyMaker.deploy(usdc.address);
    await bountymaker.deployed();

    const tokenApproval = await usdc.approve(
      bountymaker.address,
      "100000000000000000000000000"
    );
    // wait until the transaction is mined
    await tokenApproval.wait();
  });

  async function bountyCreator(
    bountyId = "VVS",
    uri = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/",
    tokenLimit = 3,
    rewards = [300, 200, 100]
  ) {
    // const bountyId = "VVS";
    // const uri = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    // const tokenLimit = 3;
    // const rewards = [300, 200, 100];

    return bountymaker.createBounty(bountyId, uri, tokenLimit, rewards);
  }

  it("Should send rewards right", async function () {
    const bountyId = "VVS";
    const uri = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit = 3;
    const rewards = [300, 200, 100];
    const balanceBefore = await usdc.balanceOf(bountymaker.address);
    const createABountyTx = await bountyCreator(
      bountyId,
      uri,
      tokenLimit,
      rewards
    );
    // wait until the transaction is mined
    await createABountyTx.wait();

    let totalRewards = 0;
    for (let i = 0; i < rewards.length; i++) {
      totalRewards += rewards[i];
    }

    expect(await usdc.balanceOf(bountymaker.address)).to.equal(
      totalRewards + parseFloat(balanceBefore)
    );
  });

  it("Should create two bounties", async function () {
    const bountyId1 = "VVS";
    const uri1 = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit1 = 3;
    const rewards1 = [300, 200, 100];

    const bountyId2 = "AAS";
    const uri2 = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit2 = 5;
    const rewards2 = [300, 200, 100, 50, 25];
    const balanceBefore = await usdc.balanceOf(bountymaker.address);

    const createABountyTx1 = await bountyCreator(
      bountyId1,
      uri1,
      tokenLimit1,
      rewards1
    );
    // wait until the transaction is mined
    await createABountyTx1.wait();
    const balanceAfterFirstTransaction = await usdc.balanceOf(
      bountymaker.address
    );

    const createABountyTx2 = await bountyCreator(
      bountyId2,
      uri2,
      tokenLimit2,
      rewards2
    );

    // wait until the transaction is mined
    await createABountyTx2.wait();
    const balanceAfterSecondTransaction = await usdc.balanceOf(
      bountymaker.address
    );

    let totalRewards = 0;
    for (let i = 0; i < rewards1.length; i++) {
      totalRewards += rewards1[i];
    }
    for (i = 0; i < rewards2.length; i++) {
      totalRewards += rewards2[i];
    }

    expect(balanceAfterSecondTransaction).to.equal(
      totalRewards + parseFloat(balanceBefore)
    );
  });

  it("Should set winners correctly and sent reward", async function () {
    const bountyId1 = "VVS";
    const uri1 = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit1 = 3;
    const rewards1 = [300, 200, 100];

    const createABountyTx = await bountyCreator(
      bountyId1,
      uri1,
      tokenLimit1,
      rewards1
    );
    await createABountyTx.wait();

    const setWinnersTx = await bountymaker.setBountyWinners(bountyId1, [
      accounts[1].address,
      accounts[2].address,
      accounts[3].address,
    ]);

    await setWinnersTx.wait();

    const winner1BalanceBefore = await usdc.balanceOf(accounts[1].address);
    const winner2BalanceBefore = await usdc.balanceOf(accounts[2].address);
    const winner3BalanceBefore = await usdc.balanceOf(accounts[3].address);

    const winnerClaim = await bountymaker.adminClaimToken(
      bountyId1,
      accounts[1].address
    );
    await winnerClaim.wait();
    const thirdClaim = await bountymaker.adminClaimToken(
      bountyId1,
      accounts[3].address
    );
    await thirdClaim.wait();
    const seccondClaim = await bountymaker.adminClaimToken(
      bountyId1,
      accounts[2].address
    );
    await seccondClaim.wait();

    expect(await usdc.balanceOf(accounts[1].address)).to.equal(
      rewards1[0] + parseFloat(winner1BalanceBefore)
    );
    expect(await usdc.balanceOf(accounts[2].address)).to.equal(
      rewards1[1] + parseFloat(winner2BalanceBefore)
    );
    expect(await usdc.balanceOf(accounts[3].address)).to.equal(
      rewards1[2] + parseFloat(winner3BalanceBefore)
    );
  });

  it("Winner can claim there reward", async function () {
    const bountyId1 = "VVS";
    const uri1 = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit1 = 3;
    const rewards1 = [300, 200, 100];

    const createABountyTx = await bountyCreator(
      bountyId1,
      uri1,
      tokenLimit1,
      rewards1
    );
    await createABountyTx.wait();

    const setWinnersTx = await bountymaker.setBountyWinners(bountyId1, [
      accounts[1].address,
      accounts[2].address,
      accounts[3].address,
    ]);

    await setWinnersTx.wait();
    const winner1BalanceBefore = await usdc.balanceOf(accounts[1].address);

    const winnerClaim = await bountymaker
      .connect(accounts[1])
      .claimToken(bountyId1);
    await winnerClaim.wait();
    expect(await usdc.balanceOf(accounts[1].address)).to.equal(
      parseFloat(winner1BalanceBefore) + rewards1[0]
    );
  });
});
