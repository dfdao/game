// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * General Purpose Utilities. Must be pure functions.
 */

library LibUtils {
    /**
     * @notice calculate amount of bits to shift left
     * @param index number of 1 byte words to shift from left
     * @return shift length of left shift
     */
    function calcBitShift(uint8 index) internal pure returns (uint8) {
        uint8 maxVal = 32;

        require(index <= maxVal, "shift index is too high");
        require(index > 0, "shift index is too low");

        uint256 bin = 8;
        uint256 shift = 256;
        return uint8(shift - (bin * index));
    }

    // inclusive on both ends
    function calculateByteUInt(
        bytes memory _b,
        uint256 _startByte,
        uint256 _endByte
    ) internal pure returns (uint256 _byteUInt) {
        for (uint256 i = _startByte; i <= _endByte; i++) {
            _byteUInt += uint256(uint8(_b[i])) * (256**(_endByte - i));
        }
    }

    /**
     * @notice x << y where y = 2^calcBitShift(index))
     */
    function shiftLeft(uint8 value, uint8 index) internal pure returns (uint256) {
        return (value * 2**calcBitShift(index));
    }
}
