// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BountyMaker is ERC721URIStorage, Ownable {
    mapping(address => mapping(string => uint256)) public claimed;
    mapping(address => mapping(string => uint128)) public winners;
    mapping(address => bool) private admins;
    mapping(string => Bounty) public bountys;
    mapping(string => uint[]) public rewards;


    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    struct Bounty{
        string uri;
        uint128 tokenLimit;
        bool active;
    }

    event Claim(
        address indexed _receiver,
        string indexed _bountyId,
        uint128 _bountyIndex,
        uint256 _contractIndex,
        bool _isAdmin
    );

    constructor()
        ERC721("bountyMaker", "BOUNTYMAKER")
    {
        admins[msg.sender] = true;
        _tokenIdTracker.increment();
    }
        modifier onlyAdmin() {
        require(admins[msg.sender] == true);
        _;
    }

    modifier eligibiltyCheck(string memory _bountyId, address to) {
        require(
            !bountys[_bountyId].active,
            "BountyMaker: bounty is not finished yet"
        );
        require(
            winners[to][_bountyId] > 0,
            "BountyMaker: address is not eligible for bounty"
        );
        require(
            claimed[to][_bountyId] == 0,
            "BountyMaker: address has already claimed token."
        );
        _;
    }

    function updateAdmin(address _admin, bool isAdmin) external onlyOwner {
        admins[_admin] = isAdmin;
    }
    

    function createBounty(
        string memory _bountyId,
        string memory uri,
        uint128 _tokenLimit,
        uint[] memory _rewards
    ) external onlyAdmin {
        require(
            bountys[_bountyId].tokenLimit == 0,
            "BountyMaker: Bounty already exists"
        );
        require(_tokenLimit > 0, "BountyMaker: Limit must be greater than 0");
        require(_tokenLimit == _rewards.length, "BountyMaker: Limit must be equal to no of rewards");
        Bounty memory bounty = Bounty(uri,_tokenLimit,true);
        rewards[_bountyId]=_rewards;
        bountys[_bountyId] = bounty;
    }

    function setBountyWinners(string memory _bountyId, address[] memory _winners) external onlyAdmin {
        require(bountys[_bountyId].active ,
            "BountyMaker: Bounty is not active");
        require(bountys[_bountyId].tokenLimit==_winners.length ,
            "BountyMaker: No of winners must be equal to tokenLimts");
        for(uint128 i=0;i<_winners.length;i++){
            winners[_winners[i]][_bountyId] = i+1;
        }    
        bountys[_bountyId].active=false;                    
    }

      function issueToken(
        string memory _bountyId,
        address to,
        bool _isAdmin
    ) internal eligibiltyCheck(_bountyId, to) returns (uint256) {
        uint128 bountyTokenIndex =winners[to][_bountyId];
        string memory _baseURI =bountys[_bountyId].uri;
        string memory _uri = string(
            abi.encodePacked(
                _baseURI,
                _bountyId,
                "-",
                uint2str(bountyTokenIndex),
                "/metadata.json"
            )
        );

        uint256 newTokenId = _tokenIdTracker.current();
        claimed[to][_bountyId] = newTokenId;

        _safeMint(to, newTokenId);
        emit Claim(to, _bountyId, bountyTokenIndex, newTokenId, _isAdmin);

        _setTokenURI(newTokenId, _uri);

        _tokenIdTracker.increment();

        return newTokenId;
    }

    function adminClaimToken(
        string memory _bountyId,
        address to
    ) external onlyAdmin returns (uint256) {
        return issueToken(_bountyId, to, true);
    }

    function claimToken(string memory _bountyId)
        external
        returns (uint256)
    {    
        return issueToken(_bountyId, msg.sender, false);
    }

            function uint2str(uint128 _i) internal pure returns (string memory str) {
        if (_i == 0) return "0";

        uint128 j = _i;
        uint128 length;
        while (j != 0) {
            length++;
            j /= 10;
        }

        bytes memory bstr = new bytes(length);
        uint128 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + (j % 10)));
            j /= 10;
        }
        str = string(bstr);
        return str;
    }
        
}