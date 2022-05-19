import React, { useState } from "react";
import { Row, Form, Button } from "react-bootstrap";

import { create as ipfsHttpClient } from "ipfs-http-client";
import { ethers } from "ethers";

const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

export default function Create({ nft, marketplace }) {
  const [name, setName] = useState();
  const [description, setDescription] = useState();
  const [price, setPrice] = useState();
  const [image, setImage] = useState();

  const uploadToIPFS = async (event) => {
    const file = event.target.files[0];
    if (typeof file === undefined) return;

    try {
      const result = await client.add(file);
      setImage(`https://ipfs.infura.io/ipfs/${result.path}`);
    } catch (error) {
      console.log("ipfs image upload error: ", error);
    }
  };

  const createNFT = async () => {
    console.log({ name, description, price, image });
    if (!name || !description || !price || !image) return;

    try {
      const result = await client.add(
        JSON.stringify({ image, price, name, description })
      );
      console.log({ result });
      const uri = `https://ipfs.infura.io/ipfs/${result.path}`;
      await (await nft.mint(uri)).wait();

      const tokenId = await nft.tokenCount();

      await (await nft.setApprovalForAll(marketplace.address, true)).wait();
      const itemPrice = ethers.utils.parseEther(price.toString());

      await (
        await marketplace.makeItem(nft.address, tokenId, itemPrice)
      ).wait();
    } catch (error) {
      console.log("ipfs uri upload error: ", error);
    }
  };

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main
          role="main"
          className="col-lg-12 mx-auto"
          style={{ maxWidth: "1000px" }}
        >
          <div className="content mx-auto">
            <Row className="g-4">
              <Form.Control
                type="file"
                required
                name="file"
                onChange={uploadToIPFS}
              />
              <Form.Control
                onChange={(e) => setName(e.target.value)}
                size="lg"
                required
                type="text"
                placeholder="Name"
              />
              <Form.Control
                onChange={(e) => setDescription(e.target.value)}
                size="lg"
                required
                as="textarea"
                placeholder="Description"
              />
              <Form.Control
                onChange={(e) => setPrice(e.target.value)}
                size="lg"
                required
                type="number"
                placeholder="Price in ETH"
              />
              <div className="d-grid px-0">
                <Button onClick={createNFT} variant="primary" size="lg">
                  Create & List NFT!
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
    </div>
  );
}
