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
const { ethers } = require("ethers");

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

async function uniSwap(inputTokenAddress, outputTokenAddress) {
  const UNISWAP_FACTORY_ABI = uniABI;
  const UNISWAP_FACTORY_ADDRESS = process.env.UNISWAP_FACTORY_ADDRESS;
  const uniswapFactoryContract = new web3.eth.Contract(
    UNISWAP_FACTORY_ABI,
    UNISWAP_FACTORY_ADDRESS
  );
  const getPair = await uniswapFactoryContract.methods
    .getPair(inputTokenAddress, outputTokenAddress)
    .call();
  console.log("pairUNI", getPair);
  const pairContract = new ethers.Contract(getPair, uniTokenABI);
  const results = await pairContract.getReserves();
  console.log("resultUNI", results);
  const inputReserve = ethers.utils.formatUnits(results[0], 18);
  const outputReserve = ethers.utils.formatUnits(results[1], 18);
  const price = Number(inputReserve / Number(outputReserve));
  console.log("priceUNI", price);
  return price;
}

async function sushiSwap(inputTokenAddress, outputTokenAddress) {
  const SUSHISWAP_FACTORY_ABI = SushiABI;
  const SUSHISWAP_FACTORY_ADDRESS = process.env.SUSHISWAP_FACTORY_ADDRESS;
  const sushiSwapFactoryContract = new web3.eth.Contract(
    SUSHISWAP_FACTORY_ABI,
    SUSHISWAP_FACTORY_ADDRESS
  );
  const getPair = await sushiSwapFactoryContract.methods
    .getPair(inputTokenAddress, outputTokenAddress)
    .call();
  console.log("pairsudhi", getPair);
  const pairContract = new ethers.Contract(getPair, uniTokenABI);
  const results = await pairContract.getReserves();
  console.log("resultsushi", results);
  const inputReserve = ethers.utils.formatUnits(results[0], 18);
  const outputReserve = ethers.utils.formatUnits(results[1], 18);
  const price = Number(inputReserve / Number(outputReserve));
  console.log("priceSushi", price);
  return price;
}
async function checkPair(args) {
  const {
    inputTokenSymbol,
    inputTokenAddress,
    outputTokenSymbol,
    outputTokenAddress,
    inputAmount,
  } = args;
  const uniRate = uniSwap(inputTokenAddress, outputTokenAddress);
  const sushiRate = sushiSwap(inputTokenAddress, outputTokenAddress);

  console.table([
    {
      "Input Token": inputTokenSymbol,
      "Output Token": outputTokenSymbol,
      "Input Amount": web3.utils.fromWei(inputAmount, "Ether"),
      "Uniswap Rate": uniRate,
      "Sushi Rate": sushiRate,
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
      inputTokenSymbol: "BNT",
      inputTokenAddress: "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
      outputTokenSymbol: "WETH",
      outputTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
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
