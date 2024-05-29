// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
import "hardhat/console.sol";

//create a contract which locks an ERC721 token and mints ERC20 tokens against it

//import ERC721 and ERC20 interfaces
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MintableERC20.sol";

contract FractionalisationProtocol {
    //create a struct to store the details of the token
    struct TokenDetails {
        address owner;
        uint256 tokenId;
        address tokenAddress;
        uint256 totalSupply;
        uint256 pricePerToken;
        uint256 totalSold;
        address fractionalTokenAddress;
        bool isLocked;
    }
    event TokenLocked(
        address indexed tokenAddress,
        address indexed owner,
        uint256 tokenId,
        uint256 totalSupply,
        uint256 pricePerToken
    );
    event TokensPurchased(
        address indexed tokenAddress,
        address indexed buyer,
        uint256 numberOfTokens
    );

    //create a mapping to store the token details
    mapping(address => mapping(uint => address)) public fractionalTokenAddress;
     mapping(address => TokenDetails) public tokenDetails;

    //create a function to lock the ERC721 token
    function lockTokenAndFractionalise(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _totalSupply,
        uint256 _pricePerToken
    ) public {
        //require that the token is not already locked
        require(
            tokenDetails[fractionalTokenAddress[_tokenAddress][_tokenId]].isLocked == false,
            "Token is already locked"
        );

        //require that the caller is the owner of the token
        require(
            IERC721(_tokenAddress).ownerOf(_tokenId) == msg.sender,
            "You are not the owner of the Asset"
        );

        //transfer the token to this contract
        IERC721(_tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokenId
        );

        //create new MintableERC20 token
        MintableERC20 newToken = new MintableERC20(
            "FRACTIONAL_DEMO_ASSET",
            "FDA",
            _totalSupply
        );
        fractionalTokenAddress[_tokenAddress][_tokenId] = address(newToken);
        //store details
        tokenDetails[address(newToken)] = TokenDetails(
            msg.sender,
            _tokenId,
            _tokenAddress,
            _totalSupply,
            _pricePerToken,
            0,
            address(newToken),
            true
        );

        emit TokenLocked(
            _tokenAddress,
            msg.sender,
            _tokenId,
            _totalSupply,
            _pricePerToken
        );
    }
    // create a method to buy these fractional tokens from this contract
    function buyFractionalTokens(
        address _fractionalTokenAddress,
        uint256 _numberOfTokens
    ) public payable {
        //require that the token is locked
        require(
            tokenDetails[_fractionalTokenAddress].isLocked == true,
            "Token is not locked"
        );


        //require that the number of tokens is less than the total supply
        require(
            tokenDetails[_fractionalTokenAddress].totalSold + _numberOfTokens <=
                tokenDetails[_fractionalTokenAddress].totalSupply,
            "Not enough tokens available"
        );
        require(
            msg.value ==
                _numberOfTokens * tokenDetails[_fractionalTokenAddress].pricePerToken,
            "Invalid amount"
        );

        //calculate the amount to be paid
        uint256 amount = _numberOfTokens *
            tokenDetails[_fractionalTokenAddress].pricePerToken;
        console.log("Amount to be paid: %s", amount, _fractionalTokenAddress);
        //transfer the amount to this contract
        IERC20(_fractionalTokenAddress).transfer(msg.sender, amount);
        tokenDetails[_fractionalTokenAddress].totalSold += _numberOfTokens;

        emit TokensPurchased(_fractionalTokenAddress, msg.sender, _numberOfTokens);
    }

    //create a view function to get the fractional token address
    function getFractionalTokenAddress(address _tokenAddress, uint256 _tokenId)
        public
        view
        returns (address)
    {
        return fractionalTokenAddress[_tokenAddress][_tokenId];
    }
}
