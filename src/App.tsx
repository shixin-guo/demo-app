import React from "react";
import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { BundlrBrowserClient } from "bundlr-browser-client";
import { ethers, BigNumber } from "ethers";
import { Button } from "@chakra-ui/button";
import { Input, HStack, Text, VStack, useToast } from "@chakra-ui/react";

const injected = new InjectedConnector({
  supportedChainIds: [1, 137],
});

const walletconnect = new WalletConnectConnector({
  rpc: {
    137: "https://polygon-rpc.com",
  },
});

function App() {
  const web3 = useWeb3React();
  const library = web3.library as ethers.providers.Web3Provider;
  const [maticBalance, setBalance] = React.useState<BigNumber>();
  const [img, setImg] = React.useState<Buffer>();
  const [price, setPrice] = React.useState<BigNumber>();
  const [bundler, setBundler] = React.useState<BundlrBrowserClient>();
  const [bundlerHttpAddress, setBundlerAddress] = React.useState<string>(
    "https://node1.bundlr.network"
  );
  const [fundAmount, setFundingAmount] = React.useState<string>();
  const [withdrawAmount, setWithdrawAmount] = React.useState<string>();
  const toast = useToast();
  const connectWeb3 = async (
    connector: InjectedConnector | WalletConnectConnector
  ) => {
    if (web3.active) {
      web3.deactivate();
      setBalance(undefined);
      setImg(undefined);
      setPrice(undefined);
      setBundler(undefined);
      return;
    }
    try {
      await web3.activate(connector);
    } catch (err) {
      console.log(err);
    }
  };

  const connectBundlr = async () => {
    if (web3.chainId !== 137) {
      // If not connected to polygon, request network switch
      await library.send("wallet_switchEthereumChain", [{ chainId: "0x89" }]);
    }
    if (!bundlerHttpAddress) return;
    const bundlr = new BundlrBrowserClient(bundlerHttpAddress, web3.library);
    try {
      // Check for valid bundlr node
      await bundlr.getPrice(1);
    } catch {
      console.log("invalid bundlr node");
      return;
    }
    try {
      await bundlr.connect();
    } catch (err) {
      console.log(err);
    } //@ts-ignore
    if (!bundlr.signer.publicKey) {
      console.log("something went wrong");
    }
    setBundler(bundlr);
  };
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
      const price = await bundler!.getPrice(img.length);
      setPrice(price);
    }
  };

  const uploadFile = async () => {
    if (img) {
      const res = await bundler!.uploadItem(img, [
        { name: "Content-Type", value: "image/png" },
      ]);
      console.log(res);
      toast({
        status: res.status === 200 ? "success" : "error",
        title: res.status === 200 ? "Successful!" : "Unsuccessful!",
        description: res.status === 200 ? res.data.id : undefined,
        duration: 5000,
      });
    }
  };

  const fundMatic = async () => {
    if (bundler && fundAmount) {
      const res = bundler.fundMatic(
        BigNumber.from(ethers.utils.parseEther(fundAmount))
      );
      console.log(res);
    }
  };

  const withdrawMatic = async () => {
    if (bundler && withdrawAmount) {
      await bundler
        .withdraw(BigNumber.from(ethers.utils.parseEther(withdrawAmount)))
        .then((data) => {
          console.log(data);
          toast({
            status: "success",
            title: "Withdrawal successful",
            duration: 5000,
          });
        })
        .catch((err: any) => {
          toast({
            status: "error",
            title: "Withdrawal Unsuccessful!",
            description: err.response.data,
            duration: 5000,
          });
        });
    }
  };
  const updateAddress = (evt: React.BaseSyntheticEvent) => {
    setBundlerAddress(evt.target.value);
  };

  const updateFundAmount = (evt: React.BaseSyntheticEvent) => {
    setFundingAmount(evt.target.value);
  };

  const updateWithdrawAmount = (evt: React.BaseSyntheticEvent) => {
    setWithdrawAmount(evt.target.value);
  };

  return (
    <VStack mt={10}>
      <HStack>
        {" "}
        <Button onClick={() => connectWeb3(injected)}>
          {web3.connector instanceof InjectedConnector && web3.active
            ? "Disconnect"
            : "Connect"}{" "}
          Metamask
        </Button>
        <Button onClick={() => connectWeb3(walletconnect)}>
          {web3.connector instanceof WalletConnectConnector && web3.active
            ? "Disconnect"
            : "Connect"}{" "}
          WalletConnect
        </Button>
      </HStack>
      <Text>Connected Account: {web3.account ?? "None"}</Text>
      <HStack>
        <Button w={400} disabled={!web3.active} onClick={connectBundlr}>
          Connect to Bundlr Network
        </Button>
        <Input
          value={bundlerHttpAddress}
          onChange={updateAddress}
          placeholder="Bundler Address"
        />
      </HStack>
      {bundler && (
        <>
          <HStack>
            <Button
              onClick={() => {
                web3.account &&
                  bundler!
                    .getBundlrBalance(web3.account)
                    .then((res: BigNumber) => setBalance(res));
              }}
            >
              Get Matic Balance
            </Button>
            {maticBalance && (
              <Text>
                Matic Balance: {ethers.utils.formatEther(maticBalance)}
              </Text>
            )}
          </HStack>
          <HStack>
            <Button w={200} onClick={fundMatic}>
              Fund Bundlr
            </Button>
            <Input
              placeholder="MATIC Amount"
              value={fundAmount}
              onChange={updateFundAmount}
            />
          </HStack>
          <HStack>
            <Button w={200} onClick={withdrawMatic}>
              Withdraw Balance
            </Button>
            <Input
              placeholder="MATIC Amount"
              value={withdrawAmount}
              onChange={updateWithdrawAmount}
            />
          </HStack>
        </>
      )}
      <Button onClick={handleFileClick}>Select file from Device</Button>
      {img && (
        <>
          <HStack>
            <Button onClick={handlePrice}>Get Price</Button>
            {price && (
              <Text>MATIC Cost: {ethers.utils.formatEther(price)}</Text>
            )}
          </HStack>
          <Button onClick={uploadFile}>Upload to Bundlr Network</Button>
        </>
      )}
    </VStack>
  );
}

export default App;
