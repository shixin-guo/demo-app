import React from "react";

import { WebBundlr } from "@bundlr-network/client"
import BigNumber from "bignumber.js";
import { Button } from "@chakra-ui/button";
import { Input, HStack, Text, VStack, useToast, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons"

import WalletConnectProvider from "@walletconnect/web3-provider";
import { providers } from "ethers"
import { Web3Provider } from "@ethersproject/providers";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
declare var window: any // TODO: specifically extend type to valid injected objects.



function App() {
  const defaultCurrency = "Select a Currency"
  const defaultSelection = "Select a Provider"
  const [currency, setCurrency] = React.useState<string>(defaultCurrency);
  const [address, setAddress] = React.useState<string>();
  const [selection, setSelection] = React.useState<string>(defaultSelection);
  const [balance, setBalance] = React.useState<string>();
  const [img, setImg] = React.useState<Buffer>();
  const [price, setPrice] = React.useState<BigNumber>();
  const [bundler, setBundler] = React.useState<WebBundlr>();
  const [bundlerHttpAddress, setBundlerAddress] = React.useState<string>(
    "https://node1.bundlr.network"
  );
  const [fundAmount, setFundingAmount] = React.useState<string>();
  const [withdrawAmount, setWithdrawAmount] = React.useState<string>();
  const [provider, setProvider] = React.useState<Web3Provider>();
  // let refresher = {};
  const toast = useToast();
  // const refresher = React.useRef();


  const clean = () => {
    setBalance(undefined);
    setImg(undefined);
    setPrice(undefined);
    setBundler(undefined);
    setProvider(undefined);
    setAddress(undefined);
    setCurrency(defaultCurrency);
    setSelection(defaultSelection);

  }


  const handleFileClick = () => {
    var fileInputEl = document.createElement("input");
    fileInputEl.type = "file";
    fileInputEl.accept = "image/*";
    fileInputEl.style.display = "none";
    document.body.appendChild(fileInputEl);
    fileInputEl.addEventListener("input", function (e) {
      handleUpload(e as any);
      document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
  };

  const handleUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    let files = evt.target.files;
    let reader = new FileReader();
    if (files && files.length > 0) {
      reader.onload = function () {
        if (reader.result) {
          setImg(Buffer.from(reader.result as ArrayBuffer));
        }
      };
      reader.readAsArrayBuffer(files[0]);
    }
  };

  const handlePrice = async () => {
    if (img) {
      const price = await bundler?.utils.getPrice(currency as string, img.length);
      //@ts-ignore
      setPrice(price?.toString());
    }
  };

  const uploadFile = async () => {
    if (img) {
      await bundler?.uploader.upload(img, [{ name: "Content-Type", value: "image/png" }])
        .then((res) => {
          toast({
            status: res?.status === 200 || res?.status === 201 ? "success" : "error",
            title: res?.status === 200 || res?.status === 201 ? "Successful!" : `Unsuccessful! ${res?.status}`,
            description: res?.data.id ? `https://arweave.net/${res.data.id}` : undefined,
            duration: 15000,
          });
        })
        .catch(e => { toast({ status: "error", title: `Failed to upload - ${e}` }) })
    }
  };

  const fund = async () => {
    if (bundler && fundAmount) {
      toast({ status: "info", title: "Funding...", duration: 15000 })
      await bundler.fund(fundAmount)
        .then(res => { toast({ status: "success", title: `Funded ${res?.target}\n tx ID : ${res?.id}`, duration: 10000 }) })
        .catch(e => { toast({ status: "error", title: `Failed to fund - ${e.data?.message || e.message}` }) })
    }

  };

  const withdraw = async () => {
    if (bundler && withdrawAmount) {
      toast({ status: "info", title: "Withdrawing..", duration: 15000 })
      await bundler
        .withdrawBalance(withdrawAmount)
        .then((data) => {
          toast({
            status: "success",
            title: `Withdrawal successful - ${data.data?.tx_id}`,
            duration: 5000,
          });
        })
        .catch((err: any) => {
          toast({
            status: "error",
            title: "Withdrawal Unsuccessful!",
            description: err.message,
            duration: 5000,
          });
        });
    }
  };

  // field change event handlers

  const updateAddress = (evt: React.BaseSyntheticEvent) => {
    setBundlerAddress(evt.target.value);
  };

  const updateFundAmount = (evt: React.BaseSyntheticEvent) => {
    setFundingAmount(evt.target.value);
  };

  const updateWithdrawAmount = (evt: React.BaseSyntheticEvent) => {
    setWithdrawAmount(evt.target.value);
  };


  const connectWeb3 = async (connector: any) => {
    if (provider) {
      await clean();
    }
    const p = new providers.Web3Provider(connector);
    await p._ready();
    return p
  }


  const providerMap = {
    "MetaMask": async (c: any) => {
      if (!window?.ethereum?.isMetaMask) return;
      await window.ethereum.enable();
      const provider = await connectWeb3(window.ethereum);
      const chainId = `0x${c.opts.chainId.toString(16)}`
      try { // additional logic for requesting a chain switch and conditional chain add.
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }],
        })
      } catch (e: any) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId, rpcUrls: c.opts.rpcUrls, chainName: c.opts.chainName
            }],
          });
        }
      }
      return provider;
    },
    "WalletConnect": async (c: any) => { return await connectWeb3(await (new WalletConnectProvider(c)).enable()) },
    "Phantom": async (c: any) => {
      if (window.solana.isPhantom) {
        await window.solana.connect();
        const p = new PhantomWalletAdapter()
        await p.connect()
        return p;
      }
    }
  } as any

  const ethProviders = ["MetaMask", "WalletConnect"]

  const currencyMap = {
    "solana": {
      providers: ["Phantom"], opts: {}
    },
    "matic": {
      providers: ethProviders,
      opts: {
        chainId: 137,
        chainName: 'Polygon Mainnet',
        rpcUrls: ["https://polygon-rpc.com"],
      },
    },
    "arbitrum": {
      providers: ethProviders,
      opts: {
        chainName: "Arbitrum One",
        chainId: 42161,
        rpcUrls: ["https://arb1.arbitrum.io/rpc"]
      }
    },
    "bnb": {
      providers: ethProviders,
      opts: {
        chainName: "Binance Smart Chain",
        chainId: 56,
        rpcUrls: ["https://bsc-dataseed.binance.org/"]
      }
    },
    "avalanche": {
      providers: ethProviders,
      opts: {
        chainName: "Avalanche Network",
        chainId: 43114,
        rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"]
      }
    },
    "boba": {
      providers: ethProviders,
      opts: {
        chainName: "BOBA L2",
        chainId: 288,
        rpcUrls: ["https://mainnet.boba.network"]
      }
    },
  } as any


  /**
   * initialises the selected provider/currency
   * @param cname currency name
   * @param pname provider name
   * @returns 
   */
  const initProvider = async () => {
    if (provider) {
      setProvider(undefined);
      setBundler(undefined);
      setAddress(undefined);
      return;
    }
    const pname = selection as string;
    const cname = currency as string;
    const p = providerMap[pname] // get provider entry
    const c = currencyMap[cname]
    console.log(`loading: ${pname} for ${cname}`)
    const providerInstance = await p(c).catch(() => { toast({ status: "error", title: `Failed to load provider ${pname}`, duration: 10000 }); return; })
    setProvider(providerInstance)
  };

  const initBundlr = async () => {
    const bundlr = new WebBundlr(bundlerHttpAddress, currency, provider)
    try {
      // Check for valid bundlr node
      await bundlr.utils.getBundlerAddress(currency)
    } catch {
      toast({ status: "error", title: `Failed to connect to bundlr ${bundlerHttpAddress}`, duration: 10000 })
      return;
    }
    try {
      await bundlr.ready();
    } catch (err) {
      console.log(err);
    } //@ts-ignore
    if (!bundlr.address) {
      console.log("something went wrong");
    }
    toast({ status: "success", title: `Connected to ${bundlerHttpAddress}` })
    setAddress(bundlr?.address)
    setBundler(bundlr);
  }

  const toProperCase = (s: string) => { return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase() }


  return (
    <VStack mt={10} >
      <HStack>
        {" "}
        <Menu >
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            {toProperCase(currency)}
          </MenuButton>
          <MenuList>
            {Object.keys(currencyMap).map((v) => {
              return (<MenuItem key={v} onClick={() => { clean(); setCurrency(v) }}>{toProperCase(v)}</MenuItem>) // proper/title case
            })}
          </MenuList>
        </Menu>
        <Menu >
          <MenuButton disabled={currency === defaultCurrency} as={Button} rightIcon={<ChevronDownIcon />}>
            {selection}
          </MenuButton>
          <MenuList>
            {Object.keys(providerMap).map((v) => {
              return ((currencyMap[currency] && currencyMap[currency].providers.indexOf(v) !== -1) ? (<MenuItem key={v} onClick={() => setSelection(v)}>{v}</MenuItem>) : undefined)
            })}
          </MenuList>
        </Menu>
        <Button disabled={!(selection !== defaultSelection && currency !== defaultCurrency && bundlerHttpAddress.length > 8)} onClick={async () => await initProvider()}>
          {provider ? "Disconnect" : "Connect"}
        </Button>
      </HStack>
      <Text>Connected Account: {address ?? "None"}</Text>
      <HStack>
        <Button w={400} disabled={!provider} onClick={async () => await initBundlr()}>
          Connect to Bundlr Network
        </Button>
        <Input
          value={bundlerHttpAddress}
          onChange={updateAddress}
          placeholder="Bundler Address"
        />
      </HStack>
      {
        bundler && (
          <>
            <HStack>
              <Button
                onClick={() => {
                  address &&
                    bundler!
                      .getBalance(address)
                      .then((res: BigNumber) => setBalance(res.toString()));
                }}
              >
                Get {toProperCase(currency)} Balance
              </Button>
              {balance && (
                <Text>
                  {toProperCase(currency)} Balance: {balance}
                </Text>
              )}
            </HStack>
            <HStack>
              <Button w={200} onClick={fund}>
                Fund Bundlr
              </Button>
              <Input
                placeholder={`${toProperCase(currency)} Amount`}
                value={fundAmount}
                onChange={updateFundAmount}
              />
            </HStack>
            <HStack>
              <Button w={200} onClick={withdraw}>
                Withdraw Balance
              </Button>
              <Input
                placeholder={`${toProperCase(currency)} Amount`}
                value={withdrawAmount}
                onChange={updateWithdrawAmount}
              />
            </HStack>
            <Button onClick={handleFileClick}>Select file from Device</Button>
            {
              img && (
                <>
                  <HStack>
                    <Button onClick={handlePrice}>Get Price</Button>
                    {price && (
                      <Text>{`${toProperCase(currency)} Cost: ${price}`}</Text>
                    )}
                  </HStack>
                  <Button onClick={uploadFile}>Upload to Bundlr Network</Button>
                </>
              )
            }
          </>
        )
      }
    </VStack >
  );
}

export default App;
