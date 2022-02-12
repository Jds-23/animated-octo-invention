// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BuildSpace is ERC721URIStorage, Ownable {
    mapping(address => mapping(string => uint256)) public claimed;
    mapping(address => bool) private admins;
    mapping(string => Bounty) public bountys;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    string contractBaseURI;
    bool allowsTransfers = false;

    struct Bounty {
        uint128 limit;
        uint128 tokenMinted;
        bytes32 merkleRoot;
    }

    event Claim(
        address indexed _receiver,
        string indexed _bountyId,
        uint128 _bountyIndex,
        uint256 _contractIndex,
        bool _isAdmin
    );

    constructor(string memory _contractBaseURI)
        ERC721("buildSpace", "BUILDSPACE")
    {
        admins[msg.sender] = true;
        contractBaseURI = _contractBaseURI;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] == true);
        _;
    }

    modifier limitCheck(string memory _bountyId, address to) {
        require(
            bountys[_bountyId].tokenMinted < bountys[_bountyId].limit,
            "BuildSpace: max tokens issued for bounty"
        );
        require(
            claimed[to][_bountyId] == 0,
            "BuildSpace: address has already claimed token."
        );
        _;
    }

    // proof check
    modifier merkleCheck(
        string memory _bountyId,
        bytes32[] memory _proof,
        address to
    ) {
        bytes32 leaf = keccak256(abi.encodePacked(to));
        // require(
        //     MerkleProof.verify(_proof, bountys[_bountyId].merkleRoot, leaf),
        //     "BuildSpace: address not eligible for claim"
        // );
        _;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return contractBaseURI;
    }

    function issueToken(
        string memory _bountyId,
        address to,
        bool _isAdmin
    ) internal limitCheck(_bountyId, to) returns (uint256) {
        uint128 nextBountyTokenIndex = bountys[_bountyId].tokenMinted;
        string memory _uri = string(
            abi.encodePacked(
                _bountyId,
                "-",
                uint2str(nextBountyTokenIndex),
                "/metadata.json"
            )
        );

        uint256 newTokenId = _tokenIdTracker.current();
        claimed[to][_bountyId] = newTokenId;

        _safeMint(to, newTokenId);
        emit Claim(to, _bountyId, nextBountyTokenIndex, newTokenId, _isAdmin);

        _setTokenURI(newTokenId, _uri);

        bountys[_bountyId].tokenMinted = nextBountyTokenIndex + 1;
        _tokenIdTracker.increment();

        return newTokenId;
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

    function adminClaimToken(
        string memory _bountyId,
        bytes32[] memory _proof,
        address to
    ) external onlyAdmin merkleCheck(_bountyId, _proof, to) returns (uint256) {
        return issueToken(_bountyId, to, true);
    }

    function claimToken(string memory _bountyId, bytes32[] memory _proof)
        external
        merkleCheck(_bountyId, _proof, msg.sender)
        returns (uint256)
    {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(_proof, bountys[_bountyId].merkleRoot, leaf),
            "BuildSpace: address not eligible for claim"
        );

        return issueToken(_bountyId, msg.sender, false);
    }

    function setAllowsTransfers(bool _allowsTransfers) external onlyAdmin {
        allowsTransfers = _allowsTransfers;
    }

    function createBounty(
        string memory _bountyId,
        uint128 _limit,
        bytes32 _merkleRoot
    ) external onlyAdmin {
        require(
            bountys[_bountyId].limit == 0,
            "BuildSpace: Bounty already exists"
        );
        require(_limit > 0, "BuildSpace: Limit must be greater than 0");
        Bounty memory bounty = Bounty(_limit, 0, _merkleRoot);
        bountys[_bountyId] = bounty;
    }

    function setMerkleRoot(string memory _bountyId, bytes32 _merkleRoot)
        external
        onlyAdmin
    {
        require(
            bountys[_bountyId].limit > 0,
            "BuildSpace: No bounty limit set"
        );
        bountys[_bountyId].merkleRoot = _merkleRoot;
    }

    function updateAdmin(address _admin, bool isAdmin) external onlyOwner {
        admins[_admin] = isAdmin;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        require(
            from == address(0) || to == address(0) || allowsTransfers,
            "Not allowed to transfer"
        );
        return super._beforeTokenTransfer(from, to, tokenId);
    }
}