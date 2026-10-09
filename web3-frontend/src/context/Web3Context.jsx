import { createContext, useState } from "react";
import { ethers } from "ethers";
import abiUangKas from "../abis/UangKas.json";

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);

    // Nanti kita isi dengan alamat asli setelah contract di-deploy
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                // Meminta user membuka MetaMask
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

                // Setup Ethers.js v6
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                // Menghubungkan contract
                const tempContract = new ethers.Contract(contractAddress, abiUangKas.abi, signer);

                setAccount(accounts[0]);
                setContract(tempContract);
                console.log("Wallet Berhasil Terhubung:", accounts[0]);
            } catch (error) {
                console.error("Gagal terhubung:", error);
            }
        } else {
            alert("Harap instal ekstensi MetaMask di browser kamu!");
        }
    };

    return (
        <Web3Context.Provider value={{ account, contract, connectWallet }}>
            {children}
        </Web3Context.Provider>
    );
};