import './App.css';
import img from "./bggg.png"
import imgeth from "./ee.png";
import endImage from "./engimage.png";
import { notification } from "antd";
import { StaticJsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { formatEther, parseEther } from "@ethersproject/units";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, Col, Menu, Row } from "antd";
import "antd/dist/antd.css";
import { useUserAddress } from "eth-hooks";
import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import Web3Modal from "web3modal";
import "./App.css";
import { Account, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "./components";
import { DAI_ABI, DAI_ADDRESS, INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useEventListener,
  useExchangePrice,
  useExternalContractLoader,
  useGasPrice,
  useOnBlock,
  useUserProvider,
} from "./hooks";

// import Hints from "./Hints";
import { ExampleUI, Hints, Subgraph } from "./views";
import DisplayVariable from './components/Contract/DisplayVariable';
import { ConsoleSqlOutlined } from '@ant-design/icons';

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = new StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544");
const mainnetInfura = new StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID);
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new StaticJsonRpcProvider("https://rinkeby.infura.io/v3/" + INFURA_ID);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};



function App(props) {

  

  const mainnetProvider = scaffoldEthProvider && scaffoldEthProvider._network ? scaffoldEthProvider : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  //console.log(address);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId = userProvider && userProvider._network && userProvider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider);

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader({ DAI: mainnetDAIContract }, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");

  // 📟 Listen for broadcast events
  const setPurposeEvents = useEventListener(readContracts, "YourContract", "SetPurpose", localProvider, 1);


  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetDAIContract
    ) {
      // console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      // console.log("🌎 mainnetProvider", mainnetProvider);
      // console.log("🏠 localChainId", localChainId);
      // console.log("👩‍💼 selected address:", address);
      // console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      // console.log("💵 yourLocalBalance", yourLocalBalance ? formatEther(yourLocalBalance) : "...");
      // console.log("💵 yourMainnetBalance", yourMainnetBalance ? formatEther(yourMainnetBalance) : "...");
      // console.log("📝 readContracts", readContracts);
      // console.log("🌍 DAI contract on mainnet:", mainnetDAIContract);
      // console.log("🔐 writeContracts", writeContracts);
    }

    

    

  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetDAIContract,
  ]);
  
  // dummy();
  // async function dummy(){
  // let res = await readContracts.YourContract.purpose();
  // console.log("The purpose is: ", res)
  // }



  let networkDisplay = "";
  
  if (localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <b>{networkLocal && networkLocal.name}</b>.
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name === "localhost";

  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId === 31337 &&
    yourLocalBalance &&
    formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            faucetTx({
              to: address,
              value: parseEther("0.01"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
    

  }






const[amount,setAmount]= useState();
const[userRound,setUserRound] = useState();
const[input,setInput] = useState(false);
const[win,setWin] = useState(false);
const[timePassed, setTimePassed] = useState(false);





  var roundNumber;
  var roundPlayers;
  var roundBalance;
  var newWinner;

  // Event listeners 


  const roundUpdates = useEventListener(
    readContracts,
    "YourContract",
    "RoundNumber",
    props.localProvider,
    1
  ); 
  try{
  if(roundUpdates[0].round != undefined){
    roundNumber = roundUpdates[0].round.toNumber();


    

  }
}
catch(e){}




const roundDetailsUpdates = useEventListener(readContracts,"YourContract","RoundDetails",props.localProvider,1);


try{
  if(roundDetailsUpdates[0][0] != undefined){
   roundPlayers = roundDetailsUpdates[0][0].toNumber();
   roundBalance = parseInt(formatEther(roundDetailsUpdates[0][1])).toFixed(10);

   
  }
}
catch(e){}


const winners = useEventListener(readContracts,"YourContract","winner",props.localProvider,1);

try{
  if(winners[0][0] != undefined){
    newWinner = winners[0][0].toNumber();
    
    
  }
}
catch(e){}


// calling functions of solidy


  const dummy = useContractReader(readContracts, "YourContract", "round"); 

  try{
    if(dummy.toNumber() != undefined){
      roundNumber = dummy.toNumber();
    }  
  }

  catch(e){
     
  }
  
  const newDummy = useContractReader(readContracts,"YourContract","roundDetails");
  try{ 
    if(newDummy[1].toNumber() != undefined){
      roundBalance = parseFloat(formatEther(newDummy[0])).toFixed(10);
       roundPlayers = newDummy[1].toNumber();
    }
  }
  catch(e){}

 










 






/// usecontractreader to read and write contract should be outside the return statemen
// writecontract and readcontracs shoudld be used inside the return statement  


async function transact(num)  {
  if(amount== null){
    setTimePassed(true);
    
  }
  else{
  await tx(writeContracts.YourContract.buyTicket(num,{
    value: parseEther(amount.toString())
  }));    
   
  
  
  
}
}

  
    



const onChangeHandler=event =>{
  setAmount(event.target.value);
  

}
setTimeout(function(){
    setWin(false);
},15000);


function renderElement(){
  if(roundPlayers == 10){
    return ( <h1 className="playersnumber10">{roundPlayers}</h1> ) 
  }
  else{
    return(<h1 className="playersnumber">{roundPlayers}</h1> );
  }
}


function renderElementWinner(){
  if(newWinner == 10){
    return( <h1 className="winnernumber10" >{newWinner}</h1> );
  }
  else{
    return( <h1 className="winnernumber" >{newWinner}</h1> );
  }
  
}
   
  return (
    <div className="App">


    <h2 className="roundno choose" >Round No :</h2>
    <div  className="card roundnocard">{roundNumber}</div>


    <h2 className="choose players" >Players:</h2>
    <div  className="numberCircle playerscircle">
       </div>


       <view>
         {renderElement()}
       </view>
      
       
       <h2 className="choose winner" >Winner:</h2>
    <div  className="numberCircle winnercircle">
       </div>

       <view>
         {renderElementWinner()}
       </view>
      
    
    <h1 className ="sub">(for previous round)</h1>


     <h2 className="choose amount">Amount :</h2>
     <input onChange={onChangeHandler} value={amount} type="text" class="form-control amountcard" id="" placeholder="Amount in ETH"></input>
     

     <h2 className="choose ticket">Choose Ticket :</h2>
     <div className ="div1">

                    <button onClick ={()=>{transact(1)}}
                     type="button" className="btn btn-primary button1">
                       <h2 className="numberInWhite">1</h2>
                     </button>

                    <button onClick ={()=>transact(2)}
                     type="button" class="btn btn-light btn-lg button1">
                       <h2 className = "numberInBlack">2</h2>
                     </button>

                    <button onClick ={()=>transact(3)}
                    type="button" class="btn btn-secondary btn-lg button1">
                      <h2 className="numberInWhite">3</h2>
                    </button>

                    <button onClick ={()=>transact(4)}   
                    type="button" class="btn btn-light btn-lg button1">
                       <h2 className = "numberInBlack">4</h2>
                    </button>

                    <button onClick ={()=>transact(5)}
                    type="button" class="btn btn-primary btn-lg button1">
                      <h2 className="numberInWhite">5</h2>
                    </button>

                    </div>
                    

                    <div className="div2">

                    <button onClick ={()=>transact(6)}
                    type ="button" class="btn btn-primary btn-lg button1">
                      <h2 className="numberInWhite">6</h2>
                    </button>

                    <button  onClick ={()=>transact(7)}
                    type="button" className="btn btn-light btn-lg button1">
                       <h2 className = "numberInBlack">7</h2>
                    </button>

                    <button  onClick ={()=>transact(8)}
                    type="button" class="btn btn-secondary btn-lg button1">
                      <h2 className="numberInWhite">8</h2>
                    </button>

                    <button  onClick ={()=>transact(9)}
                     type="button" class="btn btn-light btn-lg button1">
                        <h2 className = "numberInBlack">9</h2>
                     </button>

                    <button  onClick ={()=>transact(10)}
                     type="button" class="btn btn-primary btn-lg button1">
                     <h2 className="numberInWhite">10</h2>
                     </button>
                    </div>
      

      <h2 className="choose balance">Round Balance:</h2> 
      <div  className="card balancecard"> {roundBalance}</div>
      <h2 className="choose eth" >ETH</h2>



      <input onChange={(e)=>{
                    setUserRound(e.target.value);
                  }}
                   type="text" className="form-control roundInput" placeholder="Round number"></input>
                  <button onClick={async()=>{
                    if(userRound == null){
                      setInput(true);
                    }
                    else{
                   var dum = await tx(writeContracts.YourContract.claimPrize(userRound));
                   if(dum!= undefined){
                     setWin(true);
                    }
                      }
                  }}
                   type="button" className="choose btn btn-warning claim">
                     <h2 className="choose end">Claim Prize</h2>
                 
                     </button>



    

  <img className="lotteryimg" src={img} alt="Iottery img" />
  {win ? <img className="etherguyimg"  src={imgeth} alt="ether guy" /> : null}
      
  <a href="https://github.com/vinay1668" >

  <img className="endLink" src={endImage} alt="github link" />
  </a>


      
      
    
      
       
        { timePassed ?
        
         (notification.error({
          message:"Please input the Amount",
          description:null
        }),setTimePassed(false)) :null} 
  
        {input ? (notification.error({
          message:"Please input the RoundNumber",
          description:null
        }),setInput(false)):null}
            
      
     
      
         

            
            
     
     
           
            
            
            



                    
                    
                  
         
                                        





























      {/* ✏️ Edit the header and change the title to your project name */

      }
      <Header/>
      {/* {networkDisplay} */}
      
    
      
      {/* <BrowserRouter>
        <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              YourContract
            </Link>
          </Menu.Item>
          <Menu.Item key="/hints">
            <Link
              onClick={() => {
                setRoute("/hints");
              }}
              to="/hints"
            >
              Hints
            </Link>
          </Menu.Item>
          <Menu.Item key="/exampleui">
            <Link
              onClick={() => {
                setRoute("/exampleui");
              }}
              to="/exampleui"
            >
              ExampleUI
            </Link>
          </Menu.Item>
          <Menu.Item key="/mainnetdai">
            <Link
              onClick={() => {
                setRoute("/mainnetdai");
              }}
              to="/mainnetdai"
            >
              Mainnet DAI
            </Link>
          </Menu.Item>
          <Menu.Item key="/subgraph">
            <Link
              onClick={() => {
                setRoute("/subgraph");
              }}
              to="/subgraph"
            >
              Subgraph
            </Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/"> */}
            {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}
                      {/* <div style={{padding:8}}>
            <Button type={"default"} onClick={()=>{
              tx( writeContracts.YourContract.setPurpose("bow bow") )
            }}>📡  Set purpose</Button>
          </div>
          <div style={{padding:8}}>
            <Button type={"default"} onClick={async ()=>{
              dum = await readContracts.YourContract.purpose()
              console.log("The changed purpose is: ", dum);
            }}>📡  Get purpose</Button>
          </div>
         */}

            {/* <Contract
              name="Badge"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            /> */}

            {/* uncomment for a second contract:
            <Contract
              name="SecondContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */}

            {/* Uncomment to display and interact with an external contract (DAI on mainnet):
            <Contract
              name="DAI"
              customContract={mainnetDAIContract}
              signer={userProvider.getSigner()}
              provider={mainnetProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */}
          {/* </Route>
          <Route path="/hints">
            <Hints
              address={address}
              yourLocalBalance={yourLocalBalance}
              mainnetProvider={mainnetProvider}
              price={price}
            /> */}
          {/* </Route>
          <Route path="/exampleui">
            <ExampleUI
              address={address}
              userProvider={userProvider}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={price}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
            />
          </Route>
          <Route path="/mainnetdai">
            <Contract
              name="DAI"
              customContract={mainnetDAIContract}
              signer={userProvider.getSigner()}
              provider={mainnetProvider}
              address={address}
              blockExplorer="https://etherscan.io/"
            />
          </Route>
          <Route path="/subgraph">
            <Subgraph
              subgraphUri={props.subgraphUri}
              tx={tx}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
            />
          </Route>
        </Switch>
      </BrowserRouter> */}

      {/* <ThemeSwitch /> */}

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div className="address" >
        <Account
          address={address}
          localProvider={localProvider}
          userProvider={userProvider}
          mainnetProvider={mainnetProvider}
          //price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
        {/* {faucetHint} */}
      </div>

     {/* <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>
          </Row>
          </div>  */}

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
       {/* <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}> */}
            
             {/* if the local provider has a signer, let's show the faucet:  */}
              {/* { faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>  */}
    </div> 
  );
}

/* eslint-disable */
window.ethereum &&
  window.ethereum.on("chainChanged", chainId => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });

window.ethereum &&
  window.ethereum.on("accountsChanged", accounts => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });
/* eslint-enable */

// export default App;

export default App;
