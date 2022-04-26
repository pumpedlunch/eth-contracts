import "./App.css";
import { useState } from "react";
import React from "react";
import { ethers } from "ethers";
import Billboard from "./artifacts/contracts/Billboard.sol/Billboard.json";

// Update with the contract address logged out to the CLI when it was deployed
const billboardAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const provider = new ethers.providers.Web3Provider(window.ethereum);
const contract = new ethers.Contract(billboardAddress, Billboard.abi, provider);

// define botSigner & contractBotSigner
const botKey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const botAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const botSigner = new ethers.Wallet(botKey, provider);
const contractBotSigner = new ethers.Contract(
  billboardAddress,
  Billboard.abi,
  botSigner
);

// bot contraints
const botMessage = "Bots are taking over the world!";
const botMaxPrice = ethers.utils.parseEther("1000");

function App() {
  // store inputs in local state
  const [billboardState, setBillboardState] = useState();
  const [amount, setAmount] = useState();

  // request access to the user's MetaMask account
  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  // call the smart contract, read the current greeting value
  async function fetchBillboardState() {
    try {
      let [message, owner, originalCost, timeRemaining, buyout] =
        await contract.getBillboardState();
      timeRemaining = timeRemaining.toNumber();

      console.log("message:", message);
      console.log("owner:", owner);
      console.log("original cost:", ethers.utils.formatEther(originalCost));
      console.log("time remaining:", timeRemaining);
      console.log("buyout:", ethers.utils.formatEther(buyout));
    } catch (err) {
      console.log("Error: ", err);
    }
  }

  // call the smart contract, send an update
  async function setBillboard() {
    if (!billboardState) return;
    if (!amount) return;
    if (typeof window.ethereum !== "undefined") {
      await requestAccount();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        billboardAddress,
        Billboard.abi,
        signer
      );
      const transaction = await contract.setMessage(billboardState, {
        value: ethers.utils.parseEther(amount),
      });
      await transaction.wait();
      await fetchBillboardState();
    }
  }

  //event listener  -------- filter for non-bot addresses
    contract.on("billboardChanged", () => {
      console.log("event heard!!!");
    //bot();
    return
  });

  async function bot() {
    console.log("bot starting...");
    //fetch billboard info & calc minCost
    let [message, owner, originalCost, timeRemaining, buyout] =
      await contractBotSigner.getBillboardState();
    const minCost = originalCost.add(buyout);
     //check that billboard owner is not bot
    if (owner.toLowerCase() !== botAddress.toLowerCase()) {
      //check botSigner account balance > cost & cost < botMaxCost
      let botBalancePromise = botSigner.getBalance();
      let botBalance;
      await botBalancePromise.then((balance) => {
        botBalance = balance;
      });
      if (botBalance.gt(minCost) && minCost.lte(botMaxPrice)) {
        //call setMessage() on bot signer
        const transaction = await contractBotSigner.setMessage(botMessage, {
          value: minCost, // insufficent value ????????????? check values
          gasLimit: 100000,
        });
        await transaction.wait();
        console.log("bot success");
      } else {
        console.log("too expensive for bot");
        return;
      }
    } else {
      console.log("bot already owns");
      return;
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={fetchBillboardState}>Fetch Billboard Info</button>
        <button onClick={setBillboard}>Set Billboard</button>
        <input
          onChange={(e) => setBillboardState(e.target.value)}
          placeholder="Set Billboard"
        />
        <input
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Set Amount"
        />
        <button onClick={bot}>Run Bot</button>
      </header>
    </div>
  );
}

export default App;
