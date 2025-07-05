import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import { ethers } from "ethers";
import fs from "fs";

require("dotenv").config(); // para que se carguen las variables de entorno
const RPC_URL = process.env.RPC_URL;
const KEYSTORE_PWD = process.env.KEYSTORE_PWD as string;
const KEYSTORE_PATH = process.env.KEYSTORE_PATH as string;

const app = express();
app.use(express.json()); // reads body of POST requests and 
app.use(cors()); // allows requests from different origins

const port = 3000;

// A. GET /api/balance/:address - returns the balance of the address

// Option 1: using fetch
app.get("/api/balance/:address", async (req: Request, res: Response) => {
    const { address } = req.params;
    const response = await fetch(`${RPC_URL}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1,
        })
    })
    const data = await response.json();
    const balance = parseInt(data.result, 16).toString();
    const date = new Date().toISOString();
    res.json({
        address: req.params.address,
        balance: balance,
        date: date
    });
});

// Option 2: using ethers library
app.get("/api/balanceEthers/:address", async (req: Request, res: Response) => {
    const { address } = req.params;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(address);
    res.json({
        address: address,
        balance: balance.toString(),
        date: new Date().toISOString()
    });
});

// B.POST /api/faucet/:address/:amount - sends the amount of ETH to the address

app.get("/api/faucet/:address/:amount", async (req: Request, res: Response) => {
    const { address, amount } = req.params;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const routeData = fs.readFileSync(KEYSTORE_PATH, "utf8");
    const wallet = await ethers.Wallet.fromEncryptedJson(routeData, KEYSTORE_PWD);
    const walletConnected = wallet.connect(provider);
    const tx = await walletConnected.sendTransaction({
        to: address,
        value: ethers.parseEther(amount)

    });
    await tx.wait();
    res.json({address, amount, fecha: new Date().toISOString()})
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
    console.log(`Test endpoints:`);
    console.log(`curl localhost:3000/api/balance/0x52f23bf558697b1d4f480e1aa27d7852709b1cc0`);
    console.log(`curl localhost:3000/api/balanceEthers/0x52f23bf558697b1d4f480e1aa27d7852709b1cc0`);
    console.log(`curl -X POST localhost:3000/api/faucet/0x16ab70009126F8806Df55ec687096Ca6efBd1F81/1`);
});