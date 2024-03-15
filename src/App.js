import logo from './logo.svg';
import './App.css';
import Web3 from 'web3';
import { useState, useEffect } from 'react';
import NFT from './models/nft'
import nftABI from './nftabi.json';
import gameABI from './game_abi.json'

const TAB = {
  Assets: 0,
  Teams: 1
}

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  const [uri, setNftUri] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ownedLoneSquad, setOwnedLoneSquad] = useState(new Map());
  const [ownedCloneSquad, setOwnedCloneSquad] = useState(new Map());
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [showLoneSquadApprove, setShowLoneSquadApprove] = useState(false);
  const [showCloneSquadApprove, setShowCloneSquadApprove] = useState(false);
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tab, setTab] = useState(TAB.Assets);

  const loneSquadAddress = '0xEbd2979d006F70df0Bb013f82141AC530a435484';
  const cloneSquadAddress = '0xc3942bC26A48e5230Cadc2755b65De65b7c8A2fc';
  const gameAddress = '0x081fBaa848EC3A3F4fB0a2718069E28B04805369';

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

  const addOwnedLoneSquad = (nfts) => {
    let nftMap = new Map();
    nfts.forEach((nft) => 
      nftMap.set(nft.id, nft)
    );
    setOwnedLoneSquad(nftMap);
  }

  const addOwnedCloneSquad = (nfts) => {
    let nftMap = new Map();
    nfts.forEach((nft) => 
      nftMap.set(nft.id, nft)
    );
    setOwnedCloneSquad(nftMap);
  }

  const getSelectedLoneSquad = () => {
    let ret = [];
    ownedLoneSquad.forEach(nft => {
      if (nft.selected)
        ret.push(nft);
    });
    return ret;
  };
  
  const getSelectedCloneSquad = () => {
    let ret = [];
    ownedCloneSquad.forEach(nft => {
      if (nft.selected)
        ret.push(nft);
    });
    return ret;
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

  const fetchUserTeams = async(address) => {
    if (web3 && accounts.length) {
      const game = new web3.eth.Contract(gameABI, gameAddress);

      try {
        const ret = await game.methods.getUserTeams(address).call();
        const arrTeams = Array.isArray(ret) ? ret : [ret];
        setUserTeams(arrTeams);
        console.log('user teams: ', arrTeams);
        return arrTeams;
      } catch (error) {
        console.log('error fetching user teams: ', error);
      }
    }
    return [];
  }

  const myTeamsHandler = async() => {
    //Get teams for user
    const arrTeams = await fetchUserTeams(accounts[0]);
    if (arrTeams.length < 1) {
      console.log('less than 1');
      return;
    }

    //Get nft's on that team
    const game = new web3.eth.Contract(gameABI, gameAddress);
    try {
      const teamId = arrTeams[0];
      const team = await game.methods.getTeam(teamId).call();
      console.log('team: ', team);

      //Associate nft's with their team
      for (let i = 0; i < team.length; i++) {
        const nftAddress = team[i].addr;
        const nftId = team[i].id;
        const ownedMap = (nftAddress === loneSquadAddress ? ownedLoneSquad : ownedCloneSquad);

        const nft = ownedMap.get(nftId);
        if (!nft) {
          console.log("failed to find nft in ownedlonesquad: ", nftId);
        }

        nft.teamId = teamId;
        console.log('setting id to: ', nft.teamId);
        ownedMap.set(nft.id, cloneNft(nft));
        if (nftAddress === loneSquadAddress) {
          setOwnedLoneSquad(ownedMap);
        } else if (nftAddress === cloneSquadAddress) {
          setOwnedCloneSquad(ownedMap);
        } else {
          console.log("err: Unknown nft address: ", nftAddress);
        }
      }
    } catch (error) {
      console.log('error fetching team map: ', error);
      return;
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

    //Add lone squad to team
    let arrTeam = [[loneSquadAddress, arrLoneSquad[0].id]]

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

        //Add to team
        arrTeam.push([cloneSquadAddress, arrCloneSquad[i].id]);
      }
    }
    setShowCloneSquadApprove(false);

    //Create team
    const game = new web3.eth.Contract(gameABI, gameAddress);
    try {
      await game.methods.createTeam(arrTeam).send({from: accounts[0]});
    } catch (error) {
      console.log('error creating team: ', error);
      return;
    }

    console.log('commitTeamHandler end');
    setErrorMessage('');
  }

  // Function to abbreviate the account address
  const getAbbreviatedAddress = (address) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Utility function to copy construct new nft
  const cloneNft = (nft) => {
    return new NFT(nft.metadata, nft.address, nft.id, nft.isSelected, nft.teamId, nft.isLocked);
  }

  // Utility function to check if any NFT is selected and update the state accordingly
  const checkForSelection = (map) => {
    return Array.from(map.values()).some(nft => nft.isSelected);
  };

  const toggleLoneSquadSelect = (index) => {
    const updatedMap = new Map(ownedLoneSquad);
    const nft = updatedMap.get(index);
    if (nft) {
      nft.isSelected = !nft.isSelected;
      updatedMap.set(nft.id, cloneNft(nft));
    }
    setOwnedLoneSquad(updatedMap);
    setShowCreateButton(checkForSelection(updatedMap));

    // Clear the error message when the selection changes
    setErrorMessage('');
  };

  const toggleCloneSquadSelect = (index) => {
    const updatedMap = new Map(ownedCloneSquad);
    const nft = updatedMap.get(index);
    if (nft) {
      nft.isSelected = !nft.isSelected;
      updatedMap.set(nft.id, cloneNft(nft));
    } else {
      console.log("toggleSelect map does not contain: ", index)
    }
    setOwnedCloneSquad(updatedMap);

    setShowCreateButton(checkForSelection(updatedMap));

    // Clear the error message when the selection changes
    setErrorMessage('');
  };

  const getOwnedNfts = async (nftContract, userAddress) => {
    let myNfts = [];
    let owned = 0;
    while (true) {
      try {
        console.log('check nfts for: ' + userAddress + ':' + owned);
        const id = await nftContract.methods.tokenOfOwnerByIndex(userAddress, owned).call();
        console.log('address owns id: ' + id);
        const nft = new NFT([], nftContract.address, id);
        myNfts.push(nft);
        owned++;
      } catch {
        break;
      }
    }

    return myNfts;
  }

  const getMetaData = async (uri, nfts, name) => {
    for (const nft of nfts) {
      try {
        // Fetch the metadata from the URI
        const response = await fetch(uri + nft.id);
        const metadata = await response.json();
        console.log(metadata);
        nft.metadata = metadata;
        //data.push({nft: name, id: id, url: metadata.image, selected: false});
      } catch {
        console.log('failed to get image: ' + nft.id);
      }
    }
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
        let nfts = await getOwnedNfts(loneSquad, myAddress);
        await getMetaData(uri, nfts, 'ls');
        addOwnedLoneSquad(nfts);
      } catch {
        console.error('Error fetching NFT data:');
      }

      //Check for clone squad data
      try{
        const cloneSquad = new web3.eth.Contract(nftABI, cloneSquadAddress);
        const uri = await cloneSquad.methods.baseURI().call();
        console.log(uri);

        //Get owned clone squad nfts
        let nfts = await getOwnedNfts(cloneSquad, myAddress);
        await getMetaData(uri, nfts, 'cs');
        addOwnedCloneSquad(nfts);
      } catch {
        console.error('Error fetching clone squad data:');
      }
    }
  }

  const showAssetsHandler = () => {
    setTab(TAB.Assets);
  }

  const showTeamsHandler = () => {
    setTab(TAB.Teams);
  }

  const renderAssets = () => {
    return (
      <>
      <h2 className="lone-squad-title">Lone Squad</h2>
          {showLoneSquadApprove && (
            <button className='mint-button' onClick={approveLoneSquadHandler}>APPROVE</button>
          )}
        <button className='mint-button' onClick={mintHandler}>MINT</button>
        {/* Lone Squad NFTs */}
        <div className='nft-container'>
          {Array.from(ownedLoneSquad.values()).map((nft, index) => (
            <div key={index}>
              {showCheckboxes && (
                <input
                  type="checkbox"
                  checked={nft.isSelected}
                  onChange={() => toggleLoneSquadSelect(nft.id)}
                />
              )}
              <img src={nft.metadata.image} alt={`NFT ${nft.id}`} className='nft-image' />
              {nft.teamId !== "" && (<p>Team Id: {String(nft.teamId).substring(0, 4)}</p>)}
            </div>
          ))}
        </div>
        {/* Clone Squad NFTs */}
        <h2 className="lone-squad-title">Clone Squad</h2>
        {showCloneSquadApprove && (
          <button className='mint-button' onClick={approveCloneSquadHandler}>APPROVE</button>
        )}
        <div className='nft-container'>
          {Array.from(ownedCloneSquad.values()).map((nft, index) => (
            <div key={index}>
              {showCheckboxes && (
                <input
                  type="checkbox"
                  checked={nft.isSelected}
                  onChange={() => toggleCloneSquadSelect(nft.id)}
                />
              )}
              <img src={nft.metadata.image} alt={`NFT ${nft.id}`} className='nft-image' />
              {nft.teamId !== "" && (<p>Team Id: {String(nft.teamId).substring(0, 4)}</p>)}
            </div>
          ))}
        </div>
      </>
    );
  };

  //Returns array of NFT objects
  const getTeamMembers = (teamId) => {
    //Get Lone Squad Member
    let arrMembers = [];
    const arrLoneSquad = Array.from(ownedLoneSquad.values());
    console.log('ownedLoneSquad size ', arrLoneSquad.length);
    for (let i = 0; i < arrLoneSquad.length; i++) {
      if (arrLoneSquad[i].teamId != "") {
        arrMembers.push(arrLoneSquad[i]);
        break;
      }
    }
    if (!arrMembers.length) {
      console.log('error: no lone squad team member found for team ', teamId);
    }

    //Get clone squad members
    const arrCloneSquad = Array.from(ownedCloneSquad.values());
    for (let i = 0; i < arrCloneSquad.length; i++) {
      if (arrCloneSquad[i].teamId === teamId)
        arrMembers.push(arrCloneSquad[i]);
    }

    return arrMembers;
  }
  
  const renderTeam = (teamId) => {
    console.log(teamId);
    const members = getTeamMembers(teamId);
    return (
      <>
      {'Team: ' + String(teamId).substring(0,4)}
      <div className='nft-container'>
        {members.map((nft, index) => (
          <div key={index}>
          <img src={nft.metadata.image} alt={`NFT ${nft.id}`} className='nft-image' />
          {nft.teamId !== "" && (<p>Team Id: {String(nft.teamId).substring(0, 4)}</p>)}
          </div>
        
        ))}
      </div>
    
    
      </>);
  }

  const renderTeams = () => {
    // You can extend this to include team-specific content
    return (
      <>
      {console.log("render teams")}
        <button className='create-team-button' onClick={myTeamsHandler}>MY TEAMS</button>
        <button className='create-team-button' onClick={createTeamHandler}>CREATE TEAM</button>

        <div className='nft-container'>
          {userTeams.length && userTeams.map((team) => (

            <div key={team}>
              {renderTeam(team)}
            </div>
          ))}
        </div>
      </>
    );
  };
  

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
        <div className='tab-button-container'>
          <button className={`tab-button ${tab === TAB.Assets ? 'tab-button-active' : ''}`} onClick={showAssetsHandler}>ASSETS</button>
          <button className={`tab-button ${tab === TAB.Teams ? 'tab-button-active' : ''}`} onClick={showTeamsHandler}>TEAMS</button>
        </div>
  
        {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
        <div className='content-box-nft'>
          {tab === TAB.Assets && renderAssets()}
          {tab === TAB.Teams && renderTeams()}
        </div>
      </div>
    </div>
  ); 
}

export default App;
