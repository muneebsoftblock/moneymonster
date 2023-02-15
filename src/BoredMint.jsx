import keccak256 from "keccak256";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  FormControl,
  FormGroup,
  Image,
  InputGroup,
  Modal
} from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { toChecksumAddress } from "web3-utils";
// import LoaderImg from "./assets/images/loader.svg";
import LoaderImg from "./assets/images/logo.png";
import "./bored-human.css";
import { getMerkleTree } from "./libs/api";
import { getContractHelper, getContractNft, getOldContractNft, oldNftAddress } from "./libs/smart-contract";
import { reSyncAccount } from "./redux/blockchain/blockchainActions";
import { fetchData } from "./redux/data/dataActions";

const backgroundImage = "";

export const BoredMint = (props) => {
  const endDate = new Date("2022-06-30T14:00:00.000Z");
  const [nowDate, setNowDate] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  const dispatch = useDispatch();
  const preSaleStartTime = new Date("2022-06-16T01:00:00.000Z").getTime();
  const saleStartTime = new Date("2022-06-17T01:00:00.000Z").getTime();
  const todayTime = new Date().getTime();

  const [preSaleActive, setPreSaleActive] = useState(
    todayTime >= preSaleStartTime && todayTime < saleStartTime
  );
  const [saleActive, saleSaleActive] = useState(todayTime >= saleStartTime);
  const [nftPrice, setNftPrice] = useState(0.19);
  const [maxNfts, setMaxNfts] = useState(5);
  const [totalSupply, setTotalSupply] = useState(1555);

  const blockchain = useSelector((state) => state.blockchain);
  const data = useSelector((state) => state.data);

  const [isCollectionHolder, setIsCollectionHolder] = useState(false);
  const [holderTokens, setHolderTokens] = useState(0);

  const [feedback, setFeedback] = useState("");
  const [isMinted, setIsMinted] = useState(false);
  const [claimingNft, setClaimingNft] = useState(false);
  const [mintingNft, setMintingNft] = useState(0);
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

  const _remainToken = async (webBlockchain) => {
    if (!!webBlockchain && !!webBlockchain.account) {
      try {
        const token = getContractNft(webBlockchain.web3);
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

    //setShowModal(true);
    //setFeedback("Minting ...");
    setClaimingNft(true);

    const nft = getContractNft(web3);
    const helper = getContractHelper(web3);

    try {
      // Mainnet

      // const price = web3.utils.fromWei(
      //   await (saleActive
      //     ? nft.methods.costPerNft().call()
      //     : nft.methods.costPerNft().call())
      // );
      
      const nftsForAddress = await helper.methods
        .GetNFTsForAddress(account, oldNftAddress, 0, 5555, 100)
        .call();

      // const _howMany = Number(mintingNft);
      // const totalPrice = web3.utils.toWei(
      //   (Number(price) * _howMany).toString()
      // );

      // const leaf = keccak256(toChecksumAddress(account));
      // const proof = getMerkleTree().getHexProof(leaf);

      // console.log("totalPrice", totalPrice);
      //Mainnet
      const purchase = nft.methods.mintClaim(nftsForAddress);
      // const purchase = nft.methods.purchasePresaleTokens(mintingNft, proof);
      // const purchase = saleActive
      //   ? nft.methods.purchaseTokens(mintingNft)
      //   : nft.methods.purchaseTokens(mintingNft);

      //This is for rinkeby
      // const purchase = nft.methods.mint(mintingNft);

      // Gas for rinkeby and mainnet
      let options = {
        from: account,
        gas: "0",
        // value: totalPrice,
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
      msg = "No hemos iniciado el mint";
    } else if (errorMsg.indexOf("You are not in presale") > -1) {
      msg = "No estás en la whitelist ";
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
        _remainToken(blockchain);
      }, 3000);
    }
  };

  useEffect(() => {
    getData();
    getContractCores();
    _remainToken(blockchain);
  }, [blockchain.account]);

  const syncCollectionHolder = async () => {
    if (accountId && web3) {
      const oldNft = getOldContractNft(web3);
      const nft = getContractNft(web3);
      const ownerTokens = await nft.methods
        .balanceOf(blockchain.account, 1)
        .call();

      setIsCollectionHolder(ownerTokens);
      setHolderTokens(ownerTokens);


      const oldOwnerTokens = await oldNft.methods
        .balanceOf(blockchain.account)
        .call();
        
      console.log('oldOwnerTokens', oldOwnerTokens, ownerTokens, accountId);
      const remainTokens = oldOwnerTokens - ownerTokens;
      setMaxNfts(remainTokens > 0 ? remainTokens : 0);
      setMintingNft(remainTokens > 0 ? remainTokens : 0 );
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
  

  return (
    <>
      <div className="mint-box-container">
        <div className="mint-box-header">
          <h1 className="sale-head">Money Monsters Club</h1>
          {!!accountId && (
            <h2 className="supply-head">
              Minteado : {remainingToken}/{totalSupply}
            </h2>
          )}
        </div> 

        <div className="mint-box">
          <p>Cuántos NFTs vas a adquirir?</p>
          {/* <p>Máximo 5 por billetera</p> */}
          <div className="mint-price">
            <p> Total: {(nftPrice * mintingNft).toFixed(2)} ETH</p>
          </div>
          <div className="mint-btn-container d-flex justify-content-center flex-column ">
            {maxNfts > 0 && (
              <div className="mint-box d-flex align-items-center flex-column justify-content-center">
                {false && (
                  <FormGroup>
                    <InputGroup className="mb-3 mint-input-group">
                      <InputGroup.Text
                        className="input-group-prepend"
                        onClick={() =>
                          setMintingNft((mintingNft) =>
                            mintingNft > 2 ? mintingNft - 1 : 1
                          )
                        }
                      >
                        -
                      </InputGroup.Text>
                      <FormControl
                        className="text-center"
                        value={mintingNft}
                        aria-label=""
                        onChange={(e) => onChangeNft(e.target.value)}
                      />
                      <InputGroup.Text
                        className="input-group-append"
                        onClick={() =>
                          setMintingNft((mintingNft) =>
                            mintingNft >= maxNfts ? maxNfts : mintingNft + 1
                          )
                        }
                      >
                        +
                      </InputGroup.Text>
                    </InputGroup>
                  </FormGroup>
                )}
              
              {!!blockchain.account && (
                <>
                  {mintingNft > 0 && (
                    <Button
                      className="btn-mint btn-transparent btn-bordered"
                      variant="outline-secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        mintNfts();
                        getData();
                      }}
                    >
                      {claimingNft ? "Minting..." : `Mint ${mintingNft}`}
                    </Button>
                  )}
                  {mintingNft === 0 && false && (
                    <Button
                      className="btn-mint btn-transparent btn-bordered disabled"
                      variant="outline-secondary"
                    >
                      Select an amount to mint
                    </Button>
                  )}
                </>
              )}
            </div>
            )}
           
            <div className="error-box">
              {
                (holderTokens > 0 && maxNfts == 0 && (
                  <p>You are already minted {holderTokens} Nft.</p>
                ))
              }
              {
                (holderTokens == 0 && maxNfts == 0 && (
                  <p>You are not holder of any Nft.</p>
                ))
              }
              {blockchain.errorMsg !== "" && <p>{blockchain.errorMsg}</p>}
              <br />
              {feedback !== "" && <p>{feedback}</p>}
              <br />
              {!isWhiteListed && `You are not whitelisted`}
            </div>
          </div>
        </div>
      </div>

      <Modal className="loader-modal" show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="loader-image">
            <div className="image-responsive">
              <Image src={LoaderImg} style={{ width: "100%" }} />
            </div>
          </div>
          <div className="error-box">
            {blockchain.errorMsg !== "" && <p>{blockchain.errorMsg}</p>}
            <br />
            {feedback !== "" && <p>{feedback}</p>}
            <br />
            {!isWhiteListed && `You are not whitelisted`}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};
