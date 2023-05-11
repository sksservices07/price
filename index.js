require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const moment = require("moment-timezone");
const numeral = require("numeral");
const _ = require("lodash");
const axios = require("axios");
const uniABI = require("./abi/uniswapABI.json");
const kyberABI = require("./abi/kyberAbi.json");
const SushiABI = require("./abi/sushiABI.json");
const uniTokenABI = require("./abi/uniswap_tokenABI.json");

// SERVER CONFIG
const PORT = process.env.PORT || 5002;
const app = express();
const server = http
  .createServer(app)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

// WEB3 CONFIG
const web3 = new Web3(
  new HDWalletProvider(process.env.PRIVATE_KEY, process.env.RPC_URL)
);

// Uniswap Factory Contract: https://etherscan.io/address/0xc0a47dfe034b400b47bdad5fecda2621de6c4d95#code
const UNISWAP_FACTORY_ABI = uniABI;
const UNISWAP_FACTORY_ADDRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const uniswapFactoryContract = new web3.eth.Contract(
  UNISWAP_FACTORY_ABI,
  UNISWAP_FACTORY_ADDRESS
);

// Kyber mainnet "Expected Rate": https://etherscan.io/address/0x96b610046d63638d970e6243151311d8827d69a5#readContract
// const KYBER_RATE_ABI = kyberABI
// const KYBER_RATE_ADDRESS = '0x96b610046d63638d970e6243151311d8827d69a5'
// const kyberRateContract = new web3.eth.Contract(KYBER_RATE_ABI, KYBER_RATE_ADDRESS)

// const SushiSwap_RATE_ABI = SushiABI
// const SushiSwap_RATE_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'
// const SushiSwapContract = new web3.eth.Contract(SushiSwap_RATE_ABI, SushiSwap_RATE_ADDRESS)

async function checkPair(args) {
  const {
    inputTokenSymbol,
    inputTokenAddress,
    outputTokenSymbol,
    outputTokenAddress,
    inputAmount,
  } = args;

  const getPair = await uniswapFactoryContract.methods
    .getPair(inputTokenAddress, outputTokenAddress)
    .call();
  const exchangeContract = new web3.eth.Contract(uniTokenABI, getPair);

  // const uniswapResult = await exchangeContract.methods
  //   .getEthToTokenInputPrice(inputAmount)
  //   .call();
  // console.log("uniResult",web3.utils.fromWei(uniswapResult, 'Ether'))
  // let kyberResult = await kyberRateContract.methods.getExpectedRate(inputTokenAddress, outputTokenAddress, inputAmount, true).call()
  // console.log("kyberResult",kyberResult)

  console.table([
    {
      "Input Token": inputTokenSymbol,
      "Output Token": outputTokenSymbol,
      "Input Amount": web3.utils.fromWei(inputAmount, "Ether"),
      "Uniswap Return": web3.utils.fromWei(uniswapResult, "Ether"),
      //'Kyber Expected Rate': web3.utils.fromWei(kyberResult.expectedRate, 'Ether'),
      //'Kyber Min Return': web3.utils.fromWei(kyberResult.slippageRate, 'Ether'),
      Timestamp: moment().tz("America/Chicago").format(),
    },
  ]);
}

let priceMonitor;
let monitoringPrice = false;

async function monitorPrice() {
  if (monitoringPrice) {
    return;
  }

  console.log("Checking prices...");
  monitoringPrice = true;

  try {
    // ADD YOUR CUSTOM TOKEN PAIRS HERE!!!

    await checkPair({
      inputTokenSymbol: "ETH",
      inputTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      outputTokenSymbol: "DAI",
      outputTokenAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
      inputAmount: web3.utils.toWei("1", "ETHER"),
    });

    // await checkPair({
    //   inputTokenSymbol: "ETH",
    //   inputTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    //   outputTokenSymbol: "MKR",
    //   outputTokenAddress: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    //   inputAmount: web3.utils.toWei("1", "ETHER"),
    // });

    // await checkPair({
    //   inputTokenSymbol: "ETH",
    //   inputTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    //   outputTokenSymbol: "KNC",
    //   outputTokenAddress: "0xdd974d5c2e2928dea5f71b9825b8b646686bd200",
    //   inputAmount: web3.utils.toWei("1", "ETHER"),
    // });

    // await checkPair({
    //   inputTokenSymbol: "ETH",
    //   inputTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    //   outputTokenSymbol: "LINK",
    //   outputTokenAddress: "0x514910771af9ca656af840dff83e8264ecf986ca",
    //   inputAmount: web3.utils.toWei("1", "ETHER"),
    // });
  } catch (error) {
    console.error(error);
    monitoringPrice = false;
    clearInterval(priceMonitor);
    return;
  }

  monitoringPrice = false;
}

// Check markets every n seconds
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000; // 3 Seconds
priceMonitor = setInterval(async () => {
  await monitorPrice();
}, POLLING_INTERVAL);
