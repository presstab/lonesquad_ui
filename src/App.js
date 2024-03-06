import logo from './logo.svg';
import './App.css';
import Web3 from 'web3';
import { useState, useEffect } from 'react';
import nftABI from './nftabi.json';
import gameABI from './game_abi.json'

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [uri, setNftUri] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loneSquadData, setLoneSquadData] = useState([]);
  const [cloneSquadData, setCloneSquadData] = useState([]);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [showLoneSquadApprove, setShowLoneSquadApprove] = useState(false);
  const [showCloneSquadApprove, setShowCloneSquadApprove] = useState(false);
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');


  const loneSquadAddress = '0xEbd2979d006F70df0Bb013f82141AC530a435484';
  const cloneSquadAddress = '0xc3942bC26A48e5230Cadc2755b65De65b7c8A2fc';
  const gameAddress = '0x53141385f811cd5451Abe6198A85432F43D4C1E3';

  useEffect(() => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      setWeb3(web3);
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccounts(accounts);
            setIsConnected(true);
          }
        })
        .catch(err => {
          console.error('Error requesting accounts:', err);
        });
    } else {
      console.log('Please install metamask!');
    }
  }, [])



  const connectWalletHandler = () => {
    window.ethereum.request({method: 'eth_requestAccounts'})
    .then(accounts => {
      setAccounts(accounts);
      setIsConnected(true);
      fetchNftData(0);
    })
    .catch(err => {
      console.error('Error connecting to MetaMask:', err);
    })
  }

  const getSelectedLoneSquad = () => {
    const selectedNfts = loneSquadData.filter(nft => nft.selected);
    return selectedNfts;
  };
  
  const getSelectedCloneSquad = () => {
    const selectedNfts = cloneSquadData.filter(nft => nft.selected);
    return selectedNfts;
  };

  const checkLockApprovedForAll = async(nftAddress, operatorAddress) => {
    const erc5058 = new web3.eth.Contract(nftABI, nftAddress);
    try {
      const isApproved = await erc5058.methods.isLockApprovedForAll(accounts[0], operatorAddress).call();
      return isApproved;
    } catch (error) {
      console.log('error checking lock approval for all');
    }
    return false;
  }

  //Check if the lock is approved for the individual tokenid
  const checkLockApprovedForId = async(tokenId, nftAddress, operatorAddress) => {
    const erc5058 = new web3.eth.Contract(nftABI, nftAddress);
    try {
      const addressApproved = await erc5058.methods.getLockApproved(tokenId).call();
      console.log('approved address is: ', addressApproved, ' operator address:', operatorAddress);
      return  addressApproved === operatorAddress;
    } catch (error) {
      console.log('error checking lock approval: ', error );
    }

    return false;
  }

  const mintHandler = async() => {
    if (web3 && accounts.length) {
      const contractAddress = '0xEbd2979d006F70df0Bb013f82141AC530a435484';
      const nftContract = new web3.eth.Contract(nftABI, contractAddress);
      
      try {
        await nftContract.methods.mint().send({from: accounts[0]});
        console.log('Minting successful');
        fetchNftData();
      } catch (error) {
        console.error('Error minting NFT:', error);
      }
    }
  }

  const createTeamHandler = async() => {
    if (!showCheckboxes) {
      //display the checkboxes
      setShowCheckboxes(!showCheckboxes);
    }
  }

  //Approve the game to operate a lock on the collection
  const approveLoneSquadHandler = async() => {
    if (web3 && accounts.length) {
      const contract = new web3.eth.Contract(nftABI, loneSquadAddress);
      try{
        await contract.methods.setLockApprovalForAll(gameAddress, true).send({from: accounts[0]});
        setShowLoneSquadApprove(false);

        //Clear error text
        setErrorMessage('');
      } catch {
        console.log('error approving lock');
      }
    }
  }

  const approveCloneSquadHandler = async() => {
    if (web3 && accounts.length) {
      const contract = new web3.eth.Contract(nftABI, cloneSquadAddress);
      try{
        await contract.methods.setLockApprovalForAll(gameAddress, true).send({from: accounts[0]});
        setShowCloneSquadApprove(false);

        //Clear error text
        setErrorMessage('');
      } catch {
        console.log('error approving lock');
      }
    }
  }

  //User has selected nft's and wants to create a team
  const commitCreateTeamHandler = async() => {
    //Check that 1 lone squad selected
    const arrLoneSquad = getSelectedLoneSquad();
    if (arrLoneSquad.length > 1) {
      console.log("too many lone squad selected");
      setErrorMessage('Error: You can only have 1 Lone Squad per team');
      return;
    }

    if (arrLoneSquad.length == 0) {
      console.log("you must select at least 1 Lone Squad");
      setErrorMessage('Error: You must select at least 1 Lone Squad"');
      return;
    }

    //Check the lock is approved for lone squad collection
    let isApproved = await checkLockApprovedForAll(loneSquadAddress, gameAddress);
    if (!isApproved) {
      //Also check if lock is approved for specific id
      isApproved = await checkLockApprovedForId(arrLoneSquad[0].id, loneSquadAddress, gameAddress);
      if (!isApproved) {
        console.log("You must approve the game to access the Lone Squad collection");
        setErrorMessage('Error: You must approve the game to access the Lone Squad collection');
        setShowLoneSquadApprove(true);
      }
      return;
    }
    setShowLoneSquadApprove(false);

    const arrCloneSquad = getSelectedCloneSquad();
    //Check that at least 1 clone squad selected
    if (arrCloneSquad.length == 0) {
      console.log("you must select at least 1 Clone Squad");
      setErrorMessage('Error: You must select at least 1 Clone Squad"');
      return;
    }

    //No more than 5 clone squad
    if (arrCloneSquad.length > 5) {
      console.log("too many clone squad selected");
      setErrorMessage('Error: You can only have 5 Clone Squad per team');
      return;
    }

    //Check lock for clone squad collection
    isApproved = await checkLockApprovedForAll(cloneSquadAddress, gameAddress);

    //Check the lock is approved for lone squad collection
    if (!isApproved) {
      //Check individual id's if necessary
      for (let i = 0; i < arrCloneSquad.length; i++) {
        isApproved = await checkLockApprovedForId(arrCloneSquad[i].id, cloneSquadAddress, gameAddress);
        if (!isApproved) {
          console.log("You must approve the game to access the Clone Squad collection");
          setErrorMessage('Error: You must approve the game to access the Clone Squad collection');
          setShowCloneSquadApprove(true);
          return;
        }
      }
    }
    setShowCloneSquadApprove(false);

    console.log('commitTeamHandler end');
    setErrorMessage('');
  }

  // Function to abbreviate the account address
  const getAbbreviatedAddress = (address) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const toggleLoneSquadSelect = (index) => {
    setLoneSquadData(loneSquadData => (
      loneSquadData.map((item, idx) => (
        index === idx ? { ...item, selected: !item.selected } : item
      ))
    ));
    // After updating the selection, check if any NFT is selected to control the visibility of the "Create" button
    setShowCreateButton(loneSquadData.some(nft => nft.selected));

    // Clear the error message when the selection changes
    setErrorMessage('');
  };

  const toggleCloneSquadSelect = (index) => {
    setCloneSquadData(cloneSquadData => (
      cloneSquadData.map((item, idx) => (
        index === idx ? { ...item, selected: !item.selected } : item
      ))
    ));
    // After updating the selection, check if any NFT is selected to control the visibility of the "Create" button
    setShowCreateButton(cloneSquadData.some(nft => nft.selected));

    // Clear the error message when the selection changes
    setErrorMessage('');
  };

  const getOwnedIds = async (nftContract, userAddress) => {
    let myIds = [];
    let owned = 0;
    while (true) {
      try {
        console.log('check nfts for: ' + userAddress + ':' + owned);
        const id = await nftContract.methods.tokenOfOwnerByIndex(userAddress, owned).call();
        console.log('address owns id: ' + id);
        myIds.push(id);
        owned++;
      } catch {
        break;
      }
    }

    return myIds;
  }

  const getMetaData = async (uri, ids, name) => {
    let data = [];
    for (const id of ids) {
      try {
        // Fetch the metadata from the URI
        const response = await fetch(uri + id);
        const metadata = await response.json();
        console.log(metadata);
        data.push({nft: name, id: id, url: metadata.image, selected: false});
      } catch {
        console.log('failed to get image: ' + id);
      }
    }

    return data;
  }

  const fetchNftData = async () => {
    if (web3 && accounts.length) {
      //Check lone squad
      const myAddress = accounts[0];
      try {
        const loneSquad = new web3.eth.Contract(nftABI, loneSquadAddress);
        const uri = await loneSquad.methods.baseURI().call();
        console.log(uri);
        setNftUri(uri);

        //get owned nfts
        let myIds = await getOwnedIds(loneSquad, myAddress);
        let data = await getMetaData(uri, myIds, 'ls');
        setLoneSquadData(data);
      } catch {
        console.error('Error fetching NFT data:');
      }

      //Check for clone squad data
      try{
        const cloneSquad = new web3.eth.Contract(nftABI, cloneSquadAddress);
        const uri = await cloneSquad.methods.baseURI().call();
        console.log(uri);

        //Get owned clone squad nfts
        let myIds = await getOwnedIds(cloneSquad, myAddress);
        let data = await getMetaData(uri, myIds, 'cs');
        setCloneSquadData(data);
      } catch {
        console.error('Error fetching clone squad data:');
      }
    }
  }

  return (
    <div className="App">
      <nav className="top-menu">
        <button className="menu-button">Home</button>
        <button className="menu-button">Game</button>
        <button className="menu-button">Stats</button>
      </nav>

      <div className="logo-box">
        <img src={logo} alt='logo'/>
      </div>

      <div className="wallet-connect-box">
      <button className='connect-button' onClick={connectWalletHandler}>
        {isConnected ? 'Connected ' + getAbbreviatedAddress(accounts[0]) : "Connect Wallet"}
      </button>
      </div>

      <div className="content-box">
        <div className='mint-button-container'>
          <button className='mint-button' onClick={mintHandler}>MINT</button>
          <button className='create-team-button' onClick={createTeamHandler}>CREATE TEAM</button>
          {showCheckboxes && showCreateButton && (
            <button className='create-team-button' onClick={commitCreateTeamHandler}>CREATE</button>
          )}
        </div>
        {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
        <div className='content-box-nft'>
          <h2 className="lone-squad-title">Lone Squad</h2>
          {showLoneSquadApprove && (
            <button className='mint-button' onClick={approveLoneSquadHandler}>APPROVE</button>
          )}
          
          <div className='nft-container'>
        
          {loneSquadData.map((item, index) => (
            <div key={index}>
              {showCheckboxes && (
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleLoneSquadSelect(index)}
                />
              )}
              <img src={item.url} alt={`NFT ${index}`} className='nft-image' />
            </div>
          ))}
        </div>
      </div>
      <div className='content-box-nft'>
      <h2 className="lone-squad-title">Clone Squad</h2>
      {showCloneSquadApprove && (
        <button className='mint-button' onClick={approveCloneSquadHandler}>APPROVE</button>
      )}
        <div className='nft-container'>
            {cloneSquadData.map((item, index) => (
              <div key={index}>
                {showCheckboxes && (
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleCloneSquadSelect(index)}
                  />
                )}
                <img src={item.url} alt={`NFT ${index}`} className='nft-image' />
              </div>
            ))

            }
        </div>
      </div>
        
        
      </div>
    </div>
  );
}

export default App;
