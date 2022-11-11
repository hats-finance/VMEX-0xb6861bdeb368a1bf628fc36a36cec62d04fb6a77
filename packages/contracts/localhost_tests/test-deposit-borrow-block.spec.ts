const { testUtils } = require('hardhat');
const { block, time, address, constants } = testUtils;

// import { ethers } from "ethers";
const chai = require("chai");
const { expect } = chai;
import { makeSuite } from "../test-suites/test-aave/helpers/make-suite";
import { DRE } from "../helpers/misc-utils";
import rawBRE from "hardhat";
import { BigNumber, utils } from "ethers";
import { ProtocolErrors } from '../helpers/types';
import {getCurvePrice} from "./helpers/curve-calculation";

before(async () => {
    await rawBRE.run("set-DRE");
    
    console.log("\n***************");
    console.log("DRE finished");
    console.log("***************\n");
  });
makeSuite(
    "collateralCap ",
    () => {
        const { VL_COLLATERAL_CANNOT_COVER_NEW_BORROW } = ProtocolErrors;
        const fs = require('fs');
        const contractGetters = require('../helpers/contracts-getters.ts');
        // const lendingPool = await contractGetters.getLendingPool();
        // Load the first signer
        
        const WETHadd = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        const WETHabi = [
            "function allowance(address owner, address spender) external view returns (uint256 remaining)",
            "function approve(address spender, uint256 value) external returns (bool success)",
            "function balanceOf(address owner) external view returns (uint256 balance)",
            "function decimals() external view returns (uint8 decimalPlaces)",
            "function name() external view returns (string memory tokenName)",
            "function symbol() external view returns (string memory tokenSymbol)",
            "function totalSupply() external view returns (uint256 totalTokensIssued)",
            "function transfer(address to, uint256 value) external returns (bool success)",
            "function transferFrom(address from, address to, uint256 value) external returns (bool success)",
            "function deposit() public payable",
            "function withdraw(uint wad) public"
        ];

        var CurveTokenAdd = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"
        var CurveTokenAddabi = [
            "function allowance(address owner, address spender) external view returns (uint256 remaining)",
            "function approve(address spender, uint256 value) external returns (bool success)",
            "function balanceOf(address owner) external view returns (uint256 balance)",
            "function decimals() external view returns (uint8 decimalPlaces)",
            "function name() external view returns (string memory tokenName)",
            "function symbol() external view returns (string memory tokenSymbol)",
            "function totalSupply() external view returns (uint256 totalTokensIssued)",
            "function transfer(address to, uint256 value) external returns (bool success)",
            "function transferFrom(address from, address to, uint256 value) external returns (bool success)",
            "function deposit() public payable",
            "function withdraw(uint wad) public"
        ];

        const DAIadd = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
        const DAI_ABI = fs.readFileSync("./localhost_tests/abis/DAI_ABI.json").toString()


        const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        const UNISWAP_ROUTER_ABI = fs.readFileSync("./localhost_tests/abis/uniswapAbi.json").toString()

        var triCryptoDepositAdd = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7" 
var triCryptoDepositAbi = [
    "function add_liquidity(uint256[3] _amounts,uint256 _min_mint_amount) external",
    "function calc_token_amount(uint256[3] _amounts,bool deposit) external view"
]

        
        it("unpause lending pools", async () => {
            const emergency = (await DRE.ethers.getSigners())[1]
            const lendingPoolConfig = await contractGetters.getLendingPoolConfiguratorProxy()
            await lendingPoolConfig.connect(emergency).setPoolPause(false,1)
          });

          it("give WETH to signer", async () => {
            const myWETH = new DRE.ethers.Contract(WETHadd,WETHabi)
            var signer = await contractGetters.getFirstSigner();
            //give signer 1 WETH so he can get LP tokens
            var options = {value: DRE.ethers.utils.parseEther("1000.0")}
            await myWETH.connect(signer).deposit(options);
            var signerWeth = await myWETH.connect(signer).balanceOf(signer.address);
            expect(
              signerWeth.toString()
            ).to.be.bignumber.equal(DRE.ethers.utils.parseEther("1000.0"), "Did not get WETH");
          });

          it("Deposit WETH for signer to borrow", async () => {
            //emergency deposits 100 WETH to pool to provide liquidity
            const myWETH = new DRE.ethers.Contract(WETHadd,WETHabi)
            const emergency = (await DRE.ethers.getSigners())[1]
            var signer = await contractGetters.getFirstSigner();
            const lendingPool = await contractGetters.getLendingPool();

            const dataProv = await contractGetters.getAaveProtocolDataProvider();

            var options = {value: DRE.ethers.utils.parseEther("100.0")}

            await myWETH.connect(emergency).deposit(options);
            var signerWeth = await myWETH.connect(emergency).balanceOf(emergency.address);

            expect(
              signerWeth.toString()
            ).to.be.bignumber.equal(DRE.ethers.utils.parseEther("100.0"), "Did not get WETH");

            await myWETH.connect(emergency).approve(lendingPool.address,DRE.ethers.utils.parseEther("100.0"))

            await lendingPool.connect(emergency).deposit(myWETH.address, 1, DRE.ethers.utils.parseUnits('100'), await emergency.getAddress(), '0'); 
            const resDat = await dataProv.getReserveData(myWETH.address, 1)
            

            expect(
              resDat.availableLiquidity.toString()
            ).to.be.bignumber.equal(DRE.ethers.utils.parseEther("100.0"), "Did not deposit WETH");
          });

          
          it("Uniswap ETH for BAL", async () => {
            var signer = await contractGetters.getFirstSigner();
            const myWETH = new DRE.ethers.Contract(WETHadd,WETHabi)
            const lendingPool = await contractGetters.getLendingPool();
            var USDCadd = "0xba100000625a3754423978a60c9317c58a424e3D"
            var USDCABI = fs.readFileSync("./localhost_tests/abis/DAI_ABI.json").toString()
            var USDC = new ethers.Contract(USDCadd,USDCABI)

            const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI)

            var path = [myWETH.address, USDC.address];
            var deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time


            var options = {value: ethers.utils.parseEther("1000.0")}

            await UNISWAP_ROUTER_CONTRACT.connect(signer).swapExactETHForTokens(ethers.utils.parseEther("1000.0"), path, signer.address, deadline,options)

            var signerAmt = await USDC.connect(signer).balanceOf(signer.address)

            expect(
                signerAmt.toString()
            ).to.not.be.bignumber.equal(0, "Did not get BAL");

            await USDC.connect(signer).approve(lendingPool.address,ethers.utils.parseEther("100000.0"))

            });

            it("set automine to false", async () => {
                var res = await block.setAutomine(false);
                expect(res.toString()).to.be.equal("true");
              });

            it("deposit and borrow WETH in the same block", async () => {
                var dataProv = await contractGetters.getAaveProtocolDataProvider()
            var signer = await contractGetters.getFirstSigner();
            const myWETH = new DRE.ethers.Contract(WETHadd,WETHabi)
            const lendingPool = await contractGetters.getLendingPool();
            var USDCadd = "0xba100000625a3754423978a60c9317c58a424e3D"
            var USDCABI = fs.readFileSync("./localhost_tests/abis/DAI_ABI.json").toString()
            var USDC = new ethers.Contract(USDCadd,USDCABI)

            await lendingPool.connect(signer).deposit(USDC.address, 1, ethers.utils.parseUnits('800'), await signer.getAddress(), '0'); 
            await lendingPool.connect(signer).setUserUseReserveAsCollateral(USDC.address, 1, true); 

            await expect(
                lendingPool.connect(signer).borrow(myWETH.address, 1, ethers.utils.parseEther(".1"), 1, '0', await signer.getAddress())
              ).to.be.revertedWith("User is not whitelisted to borrow and deposit in same block");

            

            block.advance();


            var userResDat = await dataProv.getUserReserveData("0xba100000625a3754423978a60c9317c58a424e3D",1,signer.address)

            expect(userResDat.currentATokenBalance.toString()).to.be.bignumber.equal(DRE.ethers.utils.parseEther("800"), "Did not get atoken");

            var resDat =  await dataProv.getReserveData("0xba100000625a3754423978a60c9317c58a424e3D",1)

            expect(resDat.availableLiquidity.toString()).to.be.bignumber.equal(DRE.ethers.utils.parseEther("800"), "Reserve doesn't have liquidity");
            block.advance();

          });

          it("whitelist signer and try again", async () => {
            var dataProv = await contractGetters.getAaveProtocolDataProvider()
            var signer = await contractGetters.getFirstSigner();
            const lendingPoolConfig = await contractGetters.getLendingPoolConfiguratorProxy()
            await lendingPoolConfig.connect(signer).addWhitelistedDepositBorrow(signer.address)

            const myWETH = new DRE.ethers.Contract(WETHadd,WETHabi)
            const lendingPool = await contractGetters.getLendingPool();
            var USDCadd = "0xba100000625a3754423978a60c9317c58a424e3D"
            var USDCABI = fs.readFileSync("./localhost_tests/abis/DAI_ABI.json").toString()
            var USDC = new ethers.Contract(USDCadd,USDCABI)


            await lendingPool.connect(signer).deposit(USDC.address, 1, ethers.utils.parseUnits('1'), await signer.getAddress(), '0'); 


            await lendingPool.connect(signer).borrow(myWETH.address, 1, ethers.utils.parseEther("0.1"), 1, '0', await signer.getAddress()); 


            block.advance();


            var userResDat = await dataProv.getUserReserveData("0xba100000625a3754423978a60c9317c58a424e3D",1,signer.address)

            expect(userResDat.currentATokenBalance.toString()).to.be.bignumber.equal(DRE.ethers.utils.parseEther("801"), "Did not get atoken");

            var resDat =  await dataProv.getReserveData("0xba100000625a3754423978a60c9317c58a424e3D",1)

            expect(resDat.availableLiquidity.toString()).to.be.bignumber.equal(DRE.ethers.utils.parseEther("801"), "Reserve doesn't have liquidity");


            var userDat = await lendingPool.connect(signer).getUserAccountData(signer.address,1)

            expect(
                userDat.totalDebtETH.toString()
              ).to.be.bignumber.equal(DRE.ethers.utils.parseEther("0.1"), "Did not get debt token");
            
            block.advance();

          });

          it("set automine back to true", async () => {
            var res = await block.setAutomine(true);
            expect(res.toString()).to.be.equal("true");
          });
    }
)
