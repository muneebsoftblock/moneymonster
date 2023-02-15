import keccak256 from "keccak256";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Container, Image, Row } from "react-bootstrap";
import { ArrowLeft } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import { toChecksumAddress } from "web3-utils";
import Logo from "./assets/images/logo.png";
import MetaMaskImg from "./assets/images/metamask.png";
import "./bored-human.css";
import { BoredMint } from "./BoredMint";
import { getMerkleTree } from "./libs/api";
import { getContractNft } from "./libs/smart-contract";
import {
  connect,
  disconnect,
  reSyncAccount
} from "./redux/blockchain/blockchainActions";
import { fetchData } from "./redux/data/dataActions";

const backgroundImage = "";

function BoredHuman() {
  const endDate = new Date("2022-05-19T14:00:00.000Z");
  const [nowDate, setNowDate] = useState(new Date());

  const dispatch = useDispatch();
  const preSaleStartTime = new Date("2022-05-19T14:00:00.000Z").getTime();
  const saleStartTime = new Date("2022-05-20T14:00:00.000Z").getTime();
  const todayTime = new Date().getTime();

  const [preSaleActive, setPreSaleActive] = useState(
    todayTime >= preSaleStartTime && todayTime < saleStartTime
  );
  const [saleActive, saleSaleActive] = useState(todayTime >= saleStartTime);
  const [nftPrice, setNftPrice] = useState(0.3);
  const [maxNfts, setMaxNfts] = useState(7);
  const [totalSupply, setTotalSupply] = useState(10000);

  const blockchain = useSelector((state) => state.blockchain);
  const data = useSelector((state) => state.data);

  const [isCollectionHolder, setIsCollectionHolder] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [isMinted, setIsMinted] = useState(false);
  const [claimingNft, setClaimingNft] = useState(false);
  const [mintingNft, setMintingNft] = useState(1);
  const [loading, setLoading] = useState(false);
  const [remainingToken, setRemaining] = useState(0);
  const [isWhiteListed, setIsWhiteListed] = useState(true);

  const web3 = !!blockchain.web3 ? blockchain.web3 : null;
  const [accountId, setAccountId] = useState(null);

  useEffect(() => {
    if (!!blockchain.account) {
      setAccountId(blockchain.account);
    }
  }, [blockchain]);

  const _remainToken = async () => {
    if (accountId && web3) {
      try {
        const token = getContractNft(web3);
        const tokenMinted = await token.methods.totalSupply().call();
        return setRemaining(tokenMinted);
      } catch (e) {}
    }
    // return _doThis(async (account, web3) => {

    // }, false);
  };

  const mintNfts = async () => {
    //const web3 = new Web3(Web3.givenProvider);
    const web3 = blockchain.web3;
    const account = blockchain.account;
    if (!mintingNft || isNaN(mintingNft)) {
      alert("Enter some nft quantity to buy");
      return;
    }

    //setFeedback("Minting ...");
    setClaimingNft(true);

    const nft = getContractNft(web3);

    try {
      // Mainnet

      const price = web3.utils.fromWei(
        await (saleActive
          ? nft.methods.costPerNft().call()
          : nft.methods.costPerNft().call())
      );

      const _howMany = Number(mintingNft);
      const totalPrice = web3.utils.toWei(
        (Number(price) * _howMany).toString()
      );

      const leaf = keccak256(toChecksumAddress(account));
      const proof = getMerkleTree().getHexProof(leaf);

      console.log("totalPrice", totalPrice);
      //Mainnet
      //const purchase = nft.methods.purchasePresaleTokens(mintingNft, proof);
      const purchase = saleActive
        ? nft.methods.purchaseTokens(mintingNft)
        : nft.methods.purchaseTokens(mintingNft, proof);

      //This is for rinkeby
      // const purchase = nft.methods.mint(mintingNft);

      // Gas for rinkeby and mainnet
      let options = {
        from: account,
        gas: "0",
        value: totalPrice,
      };

      const estimateGas = Math.trunc(await purchase.estimateGas(options));

      try {
        options = {
          ...options,
          gas: "" + estimateGas,
        };
      } catch (e) {
        parseErrorMessage(e);
        setClaimingNft(false);
        return;
      }

      try {
        setLoading(true);
        await purchase.send(options).on("confirmation", (i) => {
          setFeedback("Felicitaciones! Mint exitoso.");
          setClaimingNft(false);
          dispatch(reSyncAccount(blockchain));
          setIsMinted(true);
          syncCollectionHolder();
          dispatch(fetchData(blockchain.account));
        });
      } catch (e) {
        setLoading(false);

        setFeedback(
          "Lo sentimos, algo salió mal, por favor inténta mas tarde."
        );
        setClaimingNft(false);
      }
    } catch (e) {
      parseErrorMessage(e);
      console.log("errorMsg", e.message.toString());

      setClaimingNft(false);
    }

    //_doThis(async (account, web3) => {}, true);
  };

  const parseErrorMessage = (e) => {
    let msg = null;
    let errorMsg = e.message.toString();
    console.log("errorMsg", errorMsg);

    try {
      let a = e.message;
      msg = JSON.parse(
        a.substring(a.indexOf("{"), a.lastIndexOf("}") + 1)
      ).message;
      msg = msg.replace("err: ", "");
      msg = msg.replace("execution reverted: ", "");
    } catch (eiii) {}

    console.log("errorMsg", errorMsg);
    if (errorMsg.indexOf("Presale is not active") > -1) {
      msg = "contract is paused";
    } else if (errorMsg.indexOf("You are not in presale") > -1) {
      msg = "No estás en la whitelist";
    }

    if (!msg || msg === undefined) {
      msg = "Fondos insuficientes";
    }

    setFeedback(msg);
  };

  const getData = () => {
    if (!!blockchain.account && blockchain.smartContract !== null) {
      dispatch(fetchData(blockchain.account));
      _remainToken();

      setInterval(() => {
        _remainToken();
      }, 3000);
    }
  };

  useEffect(() => {
    getData();
    getContractCores();
    _remainToken();
  }, [blockchain.account]);

  const syncCollectionHolder = async () => {
    if (accountId && web3) {
      const nft = getContractNft(web3);
      const ownerTokens = await nft.methods
        .balanceOf(blockchain.account, 1)
        .call();

      setIsCollectionHolder(ownerTokens.length > 0);
    }
    // if (!!blockchain.account) {
    //   _doThis(async (account, web3) => {
    //   });
    // }
  };

  useEffect(() => {
    syncCollectionHolder();
  }, [accountId]);

  const getContractCores = async () => {
    if (accountId && web3) {
      const nft = getContractNft(web3);

      let priceMethod = nft.methods.costPerNft();
      let maxMintAmountMethod = nft.methods.presaleMaxMint();
      let maxSupplyMethod = nft.methods.maxSupply();
      const token = getContractNft(web3);
      const tokenMinted = await token.methods.totalSupply().call();

      if (saleActive) {
        priceMethod = nft.methods.costPerNft();
        maxMintAmountMethod = nft.methods.maxMintAmount();
      } else if (preSaleActive) {
      }

      const price = web3.utils.fromWei(await priceMethod.call());
      const maxMintAmount = await maxMintAmountMethod.call();
      const maxSupply = await maxSupplyMethod.call();

      setNftPrice(price);
      setMaxNfts(maxMintAmount);
      setTotalSupply(parseInt(maxSupply));
      setRemaining(tokenMinted);
    }
    // _doThis(async (account, web3) => {
    //   try {
    //   } catch (e) {}
    // }, false);
  };

  const onChangeNft = useCallback(
    (value) => {
      value = parseInt(value);
      value = isNaN(value) ? 1 : value;
      if (value > maxNfts) {
        setMintingNft(maxNfts);
      } else if (value < 2) {
        setMintingNft(1);
      } else {
        setMintingNft(value);
      }
    },
    [maxNfts]
  );

  const content = (
    <>
      <Container fluid>
        <Container>
          <Row className="">
            <Col md={12}>
              <div className="top-navbar">
                <div className="d-flex header-flex align-items-center text-center justify-content-between">
                  <div className="logo-container">
                    <div className="image-responsive">
                      <Image
                        src={Logo}
                        className="website-logo"
                        style={{ maxWidth: 300 }}
                      />
                    </div>
                  </div>

                  <div className="social">
                    {(blockchain.account === "" ||
                      blockchain.smartContract === null) && (
                      <a href="https://moneymonstersclub.io/">
                        <Button
                          style={{ marginLeft: 3 }}
                          className="btn btn-transparent btn-bordered ml-2"
                          variant="outline-secondary"
                        >
                          {/* <Image src={MetaMaskImg} className="connect-metamask" /> */}
                          <ArrowLeft /> Volver al inicio
                        </Button>
                      </a>
                    )}
                    {!!blockchain.account && (
                      <Button
                        style={{ marginLeft: 3 }}
                        className="btn btn-transparent btn-bordered ml-2"
                        variant="outline-secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          dispatch(disconnect());
                          getData();
                        }}
                      >
                        <Image src={MetaMaskImg} className="connect-metamask" />
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          <Container className="center__mint__area">
            <Row className="d-flex align-items-center mint-area">
              {/* <Col md={6} style={{ zIndex: 999 }}>
                <div className="side-img text-center">
                  <Image
                    src={sideImg}
                    fluid
                    roundedCircle
                    style={{ zIndex: 999 }}
                  />
                </div>
              </Col> */}
              <Col md={12}>
                <Card className="text-center mint-card">
                  <Card.Body className="text-center">
                    <Row>
                      <Col md={12}>
                        {remainingToken >= totalSupply && (
                          <>
                            {remainingToken}/{totalSupply}
                            <h4>The sale has ended.</h4>
                            <Button className="btn-connect" variant="primary">
                              <a
                                target={"_blank"}
                                href={"https://opensea.io"}
                                rel="noreferrer"
                              >
                                Opensea.io
                              </a>
                            </Button>
                          </>
                        )}
                        {/* <div className="price-box">
                        <span id="ETH">{nftPrice}</span> ETH + Gas Fee Required
                      </div> */}
                        <div className="mint-action-box">
                          <BoredMint blockchain={blockchain} />
                          {(blockchain.account === "" ||
                            blockchain.smartContract === null) && (
                            <Button
                              style={{ marginLeft: 3 }}
                              className="btn btn-transparent btn-bordered ml-2"
                              variant="outline-secondary"
                              onClick={(e) => {
                                e.preventDefault();
                                dispatch(connect());
                                getData();
                              }}
                            >
                              <Image
                                src={MetaMaskImg}
                                className="connect-metamask"
                              />
                              Conectar billetera
                            </Button>
                          )}
                        </div>
                        {(blockchain.account === "" ||
                          blockchain.smartContract === null) && (
                          <div className="error-box" style={{ marginTop: 50 }}>
                            {blockchain.errorMsg !== "" && (
                              <p>{blockchain.errorMsg}</p>
                            )}
                            {feedback !== "" && <p>{feedback}</p>}
                            {!isWhiteListed && `You are not whitelisted`}
                          </div>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
          <Row>
            <Col md={6} className="footer-socials">
              <div class=" d-flex align-items-center ">
                <div className="social-item">
                  <a
                    href="http://discord.gg/6a4vYtGxAD"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src="/images/discordwhite.svg" alt="Discord Icon" />
                  </a>
                </div>
                <div className="social-item">
                  {" "}
                  <a
                    href="https://twitter.com/MoneyMonstersOF"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src="/images/twitterwhite.svg" alt="Twitter Icon" />
                  </a>
                </div>
                <div className="social-item">
                  <a
                    href="https://www.instagram.com/moneymonstersclub/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src="/images/instawhite.svg" alt="Instagram Icon" />
                  </a>
                </div>
                {/* <div className="social-item">
                  <a
                    href="https://medium.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src="/images/medium.png" alt="Medium Icon" />
                  </a>
                </div> */}
                <div className="social-item">
                  <a
                    href="https://opensea.io/collection/moneymonstersclub"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src="/images/openseawhite.png" alt="Opensea Icon" />
                  </a>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </Container>
    </>
  );

  return (
    <>
      <div className="section main_slider mt-0" id="home">
        <Container fluid>
          <div
            id="videoWrapper"
            style={{ minHeight: 600 }}
            className="videoWrapper"
          >
            {/* <video
              disablePictureInPicture
              controlsList="nodownload"
              id="myVideo"
              muted
              autoPlay
              loop
              style={{ width: "100%" }}
            >
              <source src={bgVideo} type="video/mp4" />
            </video> */}
          </div>
        </Container>

        <div className="video-text-container" style={{ minHeight: 520 }}>
          {content}
        </div>
      </div>
    </>
  );
}

export default BoredHuman;
