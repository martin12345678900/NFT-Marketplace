import logo from "./logo.png";
import "./App.css";

import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navigation from "./Navbar";

import { ethers } from "ethers";
import NftContractAddress from "../contractsData/NFT-address.json";
import NftContractAbi from "../contractsData/NFT.json";
import MarketplaceContractAddress from "../contractsData/Marketplace-address.json";
import MarketplaceContractAbi from "../contractsData/Marketplace.json";

import Home from "./Home";
import Create from "./Create";
import MyListedItems from "./MyListedItems";
import MyPurchases from "./MyPurchases";
import { Spinner } from "react-bootstrap";

function App() {
  const [account, setAccount] = useState();
  const [marketplaceContract, setMarketplaceContract] = useState();
  const [nftContract, setNftContract] = useState();
  const [loading, setLoading] = useState(true);

  console.log({ account, marketplaceContract, nftContract });

  const web3Handler = async () => {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);

    console.log({ accounts });
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const signer = provider.getSigner();

    loadContracts(signer);
  };

  const loadContracts = (signer) => {
    const marketplaceContract = new ethers.Contract(
      MarketplaceContractAddress.address,
      MarketplaceContractAbi.abi,
      signer
    );
    setMarketplaceContract(marketplaceContract);

    const nftContract = new ethers.Contract(
      NftContractAddress.address,
      NftContractAbi.abi,
      signer
    );
    setNftContract(nftContract);

    setLoading(false);
  };
  return (
    <Router>
      <Navigation account={account} web3Handler={web3Handler} />
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "80vh",
          }}
        >
          <Spinner animation="border" style={{ display: "flex" }} />
          <p className="mx-3 my-0">Awaiting metamask connection</p>
        </div>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <Home marketplace={marketplaceContract} nft={nftContract} />
            }
          />
          <Route
            path="/create"
            element={
              <Create marketplace={marketplaceContract} nft={nftContract} />
            }
          />
          <Route path="/my-listed-items" element={<MyListedItems />} />
          <Route path="/my-purchases" element={<MyPurchases />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
