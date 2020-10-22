import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import {
  Heading,
  Stack,
  Box,
  useClipboard,
  Input,
  Button,
  Flex,
} from '@chakra-ui/core';
import { useParams } from 'react-router-dom';
import SupporterFunds from './supporterFunds';
// import SupporterGiveaways from './supporterGiveaways';
import SupporterLevel from './supporterLevel';

// ABI Imports
import ERC20ABI from '../abi/ERC20.json';
import LendingPoolAddressProviderABI from '../abi/LendingPoolAddressesProvider.json';
import LendingPoolABI from '../abi/LendingPool.json';
import minABI from '../abi/minABI.json';
import SupporterAccount from './supporterAccount';

const ropstenEthTokenAddress = '';
const ropstenDaiTokenAddress = '0xf80a32a835f79d7787e8a8ee5721d0feafd78108';
const ropstenADaiTokenAddress = '0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201';

function Supporter() {
  const { creatorAddress } = useParams();

  const [web3, setWeb3] = useState(null);
  const [myAddress, setMyAddress] = useState(null);
  const [raidenAddress, setRaidenAddress] = useState(null);

  const [metamaskEthBalance, setMetamaskEthBalance] = useState(0);
  const [metamaskDaiBalance, setMetamaskDaiBalance] = useState(0);
  const [metamaskADaiBalance, setMetamaskADaiBalance] = useState(0);
  const [raidenEthBalance, setRaidenEthBalance] = useState(0);
  const [raidenDaiBalance, setRaidenDaiBalance] = useState(0);
  const [raidenADaiBalance, setRaidenADaiBalance] = useState(0);

  function testFunction() {
    console.log('inside test function');
  }

  async function getBalance(userAddress, tokenAddress) {
    console.log(
      'user address: ' + userAddress + ' and token address: ' + tokenAddress
    );
    let tokenContract = new window.web3.eth.Contract(ERC20ABI, tokenAddress);
    let balance = 0;
    await tokenContract.methods
      .balanceOf(userAddress)
      .call()
      .then((res) => {
        balance = res;
      })
      .catch((e) => {
        throw Error(`Error getting lendingPool address: ${e.message}`);
      });

    balance = Number(balance / Math.pow(10, 18));
    balance = balance.toPrecision(3);
    return Number(balance);
  }

  useEffect(() => {
    async function getMetamaskAccount() {
      const web3Instance = new Web3(window.ethereum);
      window.ethereum.enable();
      window.web3 = web3Instance;

      setWeb3(web3Instance);
      const address = (await web3Instance.eth.getAccounts())[0];
      console.log('Metamask Wallet Address: ' + address);
      setMyAddress(address);

      // setMetamaskEthBalance(getBalance(address, ropstenEthTokenAddress));
      setMetamaskDaiBalance(await getBalance(address, ropstenDaiTokenAddress));
      setMetamaskADaiBalance(
        await getBalance(address, ropstenADaiTokenAddress)
      );
    }

    async function getRaidenAccount() {
      // call the raiden api for fetching the address
      let raidenNetworkAddress = null;
      await fetch('http://localhost:5001/api/v1/address')
        .then((res) => res.json())
        .then((data) => {
          raidenNetworkAddress = data['our_address'];
        })
        .catch((e) => {
          console.log('error in fetching raiden account: ' + e.message);
        });

      console.log('Raiden Wallet Address: ' + raidenNetworkAddress);
      setRaidenAddress(raidenNetworkAddress);

      // setRaidenEthBalance(await getBalance(raidenAddress, ropstenEthTokenAddress));
      setRaidenDaiBalance(
        await getBalance(raidenNetworkAddress, ropstenDaiTokenAddress)
      );
      setRaidenADaiBalance(
        await getBalance(raidenNetworkAddress, ropstenADaiTokenAddress)
      );
    }

    getMetamaskAccount();
    getRaidenAccount();
  }, []);

  // Create the LendingPoolAddressProvider contract instance
  function getLendingPoolAddressProviderContract() {
    const lpAddressProviderAddress =
      '0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728'; // ropsten test net address, for other addresses: https://docs.aave.com/developers/developing-on-aave/deployed-contract-instances
    const lpAddressProviderContract = new web3.eth.Contract(
      LendingPoolAddressProviderABI,
      lpAddressProviderAddress
    );
    return lpAddressProviderContract;
  }

  // Get the latest LendingPoolCore address
  async function getLendingPoolCoreAddress() {
    const lpCoreAddress = await getLendingPoolAddressProviderContract()
      .methods.getLendingPoolCore()
      .call()
      .catch((e) => {
        throw Error(`Error getting lendingPool address: ${e.message}`);
      });

    console.log('LendingPoolCore address: ', lpCoreAddress);
    return lpCoreAddress;
  }

  // Get the latest LendingPool address
  async function getLendingPoolAddress() {
    const lpAddress = await getLendingPoolAddressProviderContract()
      .methods.getLendingPool()
      .call()
      .catch((e) => {
        throw Error(`Error getting lendingPool address: ${e.message}`);
      });
    console.log('LendingPool address: ', lpAddress);
    return lpAddress;
  }

  /**
   * Deposit DAI into Aave to receive the equivalent aDAI
   * Note: User must have DAI already in their wallet!
   */
  async function deposit() {
    const daiAmountinWei = web3.utils.toWei('1000', 'ether').toString();
    const daiAddress = '0xf80a32a835f79d7787e8a8ee5721d0feafd78108'; // ropsten testnet dai
    // const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // ropsten testnet ETH

    const referralCode = '0';

    try {
      const lpCoreAddress = await getLendingPoolCoreAddress();

      // Approve the LendingPoolCore address with the DAI contract
      const daiContract = new web3.eth.Contract(ERC20ABI, daiAddress);
      await daiContract.methods
        .approve(lpCoreAddress, daiAmountinWei)
        .send({ from: myAddress })
        .catch((e) => {
          throw Error(`Error approving DAI allowance: ${e.message}`);
        });

      // Make the deposit transaction via LendingPool contract
      const lpAddress = await getLendingPoolAddress();
      const lpContract = new web3.eth.Contract(LendingPoolABI, lpAddress);
      await lpContract.methods
        .deposit(daiAddress, daiAmountinWei, referralCode)
        .send({ from: myAddress })
        .catch((e) => {
          throw Error(
            `Error depositing to the LendingPool contract: ${e.message}`
          );
        });
    } catch (e) {
      alert(e.message);
      console.log(e.message);
    }
    console.log('deposit completed.');
  }

  async function transferToRaiden(token, amount) {
    // assign token address for ropsten network

    const tokenAddress = '';
    if (token === 'eth') {
      tokenAddress = '';
    } else if (token === 'dai') {
      tokenAddress = '0xf80a32a835f79d7787e8a8ee5721d0feafd78108';
    } else if (token === 'adai') {
      tokenAddress = '0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201';
    } else {
      return;
    }
  }

  return (
    <>
      {myAddress == null ? (
        <Stack
          ml="300px"
          mr="300px"
          mt="100px"
          border={30}
          borderRadius={40}
          borderWidth="20px"
          backgroundColor="whiteAlpha.500"
          opacity={1}
          shadow="md"
        >
          <Heading padding="20px" textAlign="center">
            Connect with Metamask to proceed
          </Heading>
        </Stack>
      ) : (
        <></>
      )}

      {raidenAddress == null ? (
        <Stack
          ml="300px"
          mr="300px"
          mt="100px"
          border={30}
          borderRadius={40}
          borderWidth="20px"
          backgroundColor="whiteAlpha.500"
          opacity={1}
          shadow="md"
        >
          <Heading padding="20px" textAlign="center">
            Unable to fetch raiden account address. Please setup a raiden node
            on your local machine to proceed. Visit{' '}
            <a href="https://docs.raiden.network/" target="_blank">
              Raiden Docs
            </a>{' '}
            for help.
          </Heading>
        </Stack>
      ) : (
        <></>
      )}

      {myAddress != null && raidenAddress != null ? (
        <>
          <Stack
            ml="300px"
            mr="300px"
            mt="100px"
            border={30}
            borderRadius={40}
            borderWidth="20px"
            backgroundColor="whiteAlpha.500"
            opacity={1}
            shadow="md"
          >
            {/** Metamask Address and Tokens */}
            <Heading padding="20px" textAlign="center" paddingBottom="0px">
              Your Metamask Account
            </Heading>
            <Flex padding="20px" align="flex-end">
              {myAddress}
            </Flex>

            {/** ETH Token */}
            <Flex padding="20px" align="flex-end">
              {metamaskEthBalance} ETH
            </Flex>

            {/** DAI Token */}
            <Flex padding="20px" align="flex-end">
              {metamaskDaiBalance} DAI
            </Flex>

            {/** aDAI (Aave Interest Bearing Token) Token */}
            <Flex padding="20px" align="flex-end">
              {metamaskADaiBalance} aDAI
            </Flex>

            {/** Raiden Address and Tokens */}
            <Heading padding="20px" textAlign="center" paddingBottom="0px">
              Your Raiden Account
            </Heading>
            <Flex padding="20px" align="flex-end">
              {raidenAddress}
            </Flex>

            {/** ETH Token */}
            <Flex padding="20px" align="flex-end">
              {raidenEthBalance} ETH
            </Flex>
            <Flex padding="20px" align="flex-end">
              <Button
                textAlign="center"
                marginLeft="100px"
                onClick={async () => await transferToRaiden('eth')}
              >
                Transfer ETH to this account
              </Button>
            </Flex>

            {/** DAI Token */}
            <Flex padding="20px" align="flex-end">
              {raidenDaiBalance} DAI
            </Flex>
            <Flex padding="20px" align="flex-end">
              <Button
                textAlign="center"
                marginLeft="100px"
                onClick={async () => await transferToRaiden('dai')}
              >
                Transfer DAI to this account
              </Button>
            </Flex>

            {/** aDAI (Aave Interest Bearing Token) Token */}
            <Flex padding="20px" align="flex-end">
              {raidenADaiBalance} aDAI
            </Flex>
            <Flex padding="20px" align="flex-end">
              <Button
                textAlign="center"
                marginLeft="100px"
                onClick={async () => await transferToRaiden('adai')}
              >
                Transfer aDAI (aave token) to this account
              </Button>
            </Flex>
          </Stack>

          <SupporterLevel supportLevel="1090" />
          <SupporterFunds frequency="week" amounts={[1, 5, 10]} />
        </>
      ) : (
        <></>
      )}
    </>
  );
}

export default Supporter;
