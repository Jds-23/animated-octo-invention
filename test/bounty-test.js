const { expect } = require("chai");
const { ethers } = require("hardhat");
const { expectRevert } = require("@openzeppelin/test-helpers");

describe("BountyMaker", function () {
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

  it("Should create a bounty", async function () {
    const bountyId = "VVS";
    const uri = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit = 3;
    const rewards = [300, 200, 100];

    const createABountyTx = await bountyCreator(
      bountyId,
      uri,
      tokenLimit,
      rewards
    );

    // wait until the transaction is mined
    await createABountyTx.wait();
    const bounty = await bountymaker.bountys(bountyId);
    expect(bounty.uri).to.equal(uri);
    expect(bounty.tokenLimit).to.equal(tokenLimit);
    expect(bounty.active).to.equal(true);
  });

  it("Should set rewards right", async function () {
    const bountyId = "VVS";
    const uri = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit = 3;
    const rewards = [300, 200, 100];

    const createABountyTx = await bountyCreator(
      bountyId,
      uri,
      tokenLimit,
      rewards
    );
    // wait until the transaction is mined
    await createABountyTx.wait();

    const _rewards = [];
    for (let i = 0; i < rewards.length; i++) {
      const response = await bountymaker.rewards(bountyId, i);
      _rewards.push(response);
    }

    expect(_rewards.length).to.equal(rewards.length);
    _rewards.map((item, i) => {
      expect(item).to.equal(rewards[i]);
    });

    // expect(bounty.uri).to.equal(uri);
    // expect(bounty.tokenLimit).to.equal(tokenLimit);
    // expect(bounty.active).to.equal(true);
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

    const createABountyTx1 = await bountyCreator(
      bountyId1,
      uri1,
      tokenLimit1,
      rewards1
    );
    const createABountyTx2 = await bountyCreator(
      bountyId2,
      uri2,
      tokenLimit2,
      rewards2
    );

    // wait until the transaction is mined
    await createABountyTx1.wait();
    const bounty1 = await bountymaker.bountys(bountyId1);
    // wait until the transaction is mined
    await createABountyTx2.wait();
    const bounty2 = await bountymaker.bountys(bountyId2);

    expect(bounty1.uri).to.equal(uri1);
    expect(bounty1.tokenLimit).to.equal(tokenLimit1);
    expect(bounty1.active).to.equal(true);
    expect(bounty2.uri).to.equal(uri2);
    expect(bounty2.tokenLimit).to.equal(tokenLimit2);
    expect(bounty2.active).to.equal(true);
  });

  it("Should reject bounty with same bountyId", async function () {
    const createABountyTx = await bountyCreator();
    await createABountyTx.wait();

    await expectRevert.unspecified(bountyCreator());
  });

  it("Should set winners correctly", async function () {
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

    const winner1 = await bountymaker.winners(accounts[1].address, bountyId1);
    const winner2 = await bountymaker.winners(accounts[2].address, bountyId1);
    const winner3 = await bountymaker.winners(accounts[3].address, bountyId1);

    expect(winner1).to.equal(1);
    expect(winner2).to.equal(2);
    expect(winner3).to.equal(3);
  });

  it("Should set winners correctly and claim reward", async function () {
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

    const winnerClaim = await bountymaker.adminClaimToken(
      bountyId1,
      accounts[1].address
    );
    const index = await winnerClaim.wait();
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

    expect(await bountymaker.balanceOf(accounts[1].address)).to.equal(1);
    expect(await bountymaker.balanceOf(accounts[2].address)).to.equal(1);
    expect(await bountymaker.balanceOf(accounts[3].address)).to.equal(1);

    // console.log(
    //   await bountymaker.tokenURI(
    //     await bountymaker.claimed(accounts[1].address, bountyId1)
    //   )
    // );
    // console.log(
    //   await bountymaker.tokenURI(
    //     await bountymaker.claimed(accounts[2].address, bountyId1)
    //   )
    // );
    // console.log(
    //   await bountymaker.tokenURI(
    //     await bountymaker.claimed(accounts[3].address, bountyId1)
    //   )
    // );
  });
  it("No dublicate claim reward", async function () {
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

    const winnerClaim = await bountymaker.adminClaimToken(
      bountyId1,
      accounts[1].address
    );
    await winnerClaim.wait();
    await expectRevert.unspecified(
      bountymaker.adminClaimToken(bountyId1, accounts[1].address)
    );
  });
  it("Non Winner should be rejected", async function () {
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

    await expectRevert.unspecified(
      bountymaker.adminClaimToken(bountyId1, accounts[4].address)
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

    const winnerClaim = await bountymaker
      .connect(accounts[1])
      .claimToken(bountyId1);
    await winnerClaim.wait();
    expect(await bountymaker.balanceOf(accounts[1].address)).to.equal(1);
  });
  it("Winner can claim there nft even without reward", async function () {
    const bountyId1 = "VVS";
    const uri1 = "ipfs://Qma9fyUqLUm3SmAdxBBS6g3qxu6xNWdrkZcuUGPNAnjv9E/";
    const tokenLimit1 = 5;
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
      accounts[4].address,
      accounts[5].address,
    ]);

    await setWinnersTx.wait();

    const winnerClaim = await bountymaker
      .connect(accounts[4])
      .claimToken(bountyId1);
    await winnerClaim.wait();
    expect(await bountymaker.balanceOf(accounts[4].address)).to.equal(1);
  });
  it("Winner cannot claim once claimed there reward", async function () {
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

    const winnerClaim = await bountymaker
      .connect(accounts[1])
      .claimToken(bountyId1);
    await winnerClaim.wait();
    await expectRevert.unspecified(
      bountymaker.connect(accounts[1]).claimToken(bountyId1)
    );
    // expect(await bountymaker.balanceOf(accounts[1].address)).to.equal(1);
  });
  it("Non-Winner should be rejected", async function () {
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

    await expectRevert.unspecified(
      bountymaker.connect(accounts[4]).claimToken(bountyId1)
    );
  });
});
