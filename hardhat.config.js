require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/3a974233c6fd4394a47c28e4555b59ff", // Replace with the actual sepolia testnet URL
      accounts: [
        
      ] // Add the accounts you want to use for testing on sepolia testnet
    }
  }
};
