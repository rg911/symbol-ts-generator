/*
 * Copyright 2021 SYMBOL
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Generator utility class.
 */
export class Utils {
    /**
     * Convert a UInt8Array input into bigInt.
     *
     * @param input - A uint8 array.
     * @returns The bigInt representation of the input.
     */
    public static bufferToBigInt(array: Uint8Array): bigint {
        const input = array.slice(0, 8).reverse();
        const Nibble_To_Char_Map = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        let s = '';
        for (const byte of input) {
            s += Nibble_To_Char_Map[byte >> 4];
            s += Nibble_To_Char_Map[byte & 0x0f];
        }
        return BigInt('0x' + s);
    }

    /**
     * Read 4 bytes as a uint32 value from buffer bytes starting at given index.
     * @param bytes - A uint8 array.
     * @param index - Index.
     * @returns integer.
     */
    public static readUint32At(bytes: Uint8Array, index: number): number {
        return (bytes[index] + (bytes[index + 1] << 8) + (bytes[index + 2] << 16) + (bytes[index + 3] << 24)) >>> 0;
    }

    /**
     * Convert uint value into buffer
     * @param uintValue - A uint8 array.
     * @param bufferSize - Buffer size.
     * @returns buffer
     */
    public static uintToBuffer(uintValue: number, bufferSize: number): Uint8Array {
        const buffer = new ArrayBuffer(bufferSize);
        const dataView = new DataView(buffer);
        try {
            if (1 === bufferSize) {
                dataView.setUint8(0, uintValue);
            } else if (2 === bufferSize) {
                dataView.setUint16(0, uintValue, true);
            } else if (4 === bufferSize) {
                dataView.setUint32(0, uintValue, true);
            } else {
                throw new Error('Unexpected bufferSize ' + bufferSize);
            }
            return new Uint8Array(buffer);
        } catch (e) {
            throw new Error(`Converting uint value ` + uintValue + ` into buffer with error: ` + e);
        }
    }
    /**
     * Convert uint value into buffer
     * @param uintValue - A uint8 array.
     * @returns buffer
     */
    public static uint8ToBuffer(uintValue: number): Uint8Array {
        return Utils.uintToBuffer(uintValue, 1);
    }

    /**
     * Convert uint value into buffer
     * @param uintValue - A uint8 array.
     * @returns buffer
     */
    public static uint16ToBuffer(uintValue: number): Uint8Array {
        return Utils.uintToBuffer(uintValue, 2);
    }

    /**
     * Convert uint value into buffer
     * @param uintValue - A uint8 array.
     * @returns buffer
     */
    public static uint32ToBuffer(uintValue: number): Uint8Array {
        return Utils.uintToBuffer(uintValue, 4);
    }

    /**
     * It validates that a value is not undefined or null
     * @param value - the value
     * @param message - the message in the exception if the value is null or undefined.
     */
    public static notNull(value: never, message: string): void {
        if (value === undefined || value === null) {
            throw new Error(message);
        }
    }

    /**
     * Convert uint8 array buffer into number
     * @param buffer - A uint8 array.
     * @returns number
     */
    public static bufferToUint(buffer: Uint8Array, size: number): number {
        const dataView = new DataView(buffer.buffer);
        try {
            if (1 === size) {
                return dataView.getUint8(0);
            } else if (2 === size) {
                return dataView.getUint16(0, true);
            } else if (4 === size) {
                return dataView.getUint32(0, true);
            }
            throw new Error('Unexpected size ' + size);
        } catch (e) {
            throw new Error(`Converting buffer into number with error:` + e);
        }
    }

    /**
     * Convert uint8 array buffer into number
     * @param buffer - A uint8 array.
     * @returns number
     */
    public static bufferToUint8(buffer: Uint8Array): number {
        return Utils.bufferToUint(buffer, 1);
    }

    /**
     * Convert uint8 array buffer into number
     * @param buffer - A uint8 array.
     * @returns number
     */
    public static bufferToUint16(buffer: Uint8Array): number {
        return Utils.bufferToUint(buffer, 2);
    }

    /**
     * Convert uint8 array buffer into number
     * @param buffer - A uint8 array.
     * @returns number
     */
    public static bufferToUint32(buffer: Uint8Array): number {
        return Utils.bufferToUint(buffer, 4);
    }

    /**
     * Convert bigint into buffer
     * @param uintValue - Uint64 (bigint).
     * @returns buffer
     */
    public static bigIntToBuffer(uintValue: bigint | number): Uint8Array {
        const hex = uintValue.toString(16).padStart(16, '0');
        const len = hex.length / 2;
        const uint8 = new Uint8Array(len);
        let i = 0;
        let j = 0;
        while (i < len) {
            uint8[i] = parseInt(hex.slice(j, j + 2), 16);
            i += 1;
            j += 2;
        }
        return uint8.reverse();
    }

    /**
     * Concatenate two arrays
     * @param array1 - A Uint8Array.
     * @param array2 - A Uint8Array.
     * @returns buffer
     */
    public static concatTypedArrays(array1: Uint8Array, array2: Uint8Array): Uint8Array {
        const newArray = new Uint8Array(array1.length + array2.length);
        newArray.set(array1);
        newArray.set(array2, array1.length);
        return newArray;
    }

    /** Converts an unsigned byte to a signed byte with the same binary representation.
     * @param input - An unsigned byte.
     * @returns A signed byte with the same binary representation as the input.
     *
     */
    public static uint8ToInt8 = (input: number): number => {
        if (0xff < input) {
            throw Error(`input '` + input + `' is out of range`);
        }
        return (input << 24) >> 24;
    };

    /** Get bytes by given sub array size.
     * @param binary - Binary bytes array.
     * @param size - Subarray size.
     * @returns buffer
     *
     */
    public static getBytes(binary: Uint8Array, size: number): Uint8Array {
        if (size > binary.length) {
            throw new RangeError();
        }
        const bytes = binary.slice(0, size);
        return bytes;
    }

    /**
     * Gets the padding size that rounds up a size to the next multiple of an alignment.
     * @param size - Inner element size
     * @param alignment - Next multiple alignment
     */
    public static getPaddingSize(size: number, alignment: number): number {
        if (alignment === 0) {
            return 0;
        }
        return 0 === size % alignment ? 0 : alignment - (size % alignment);
    }

    /**
     * Adds the padding to the reported size according to the alignment
     * @param size - the size
     * @param alignment - the alignment
     */
    public static getSizeWithPadding(size: number, alignment: number): number {
        return size + Utils.getPaddingSize(size, alignment);
    }

    /**
     * Tries to compact a bigInt into a simple numeric.
     * @param bigInt - A bigInt value.
     * @returns the number of the bigint
     */
    public static compact(bigInt: bigint | number): number {
        if (bigInt > Number.MAX_SAFE_INTEGER) {
            throw new Error('bigint ' + bigInt + ' is greater then Number.MAX_SAFE_INTEGER. It cannot be converted to number!');
        }
        return Number(bigInt);
    }

    /**
     * Converts a numeric unsigned integer into a bigInt.
     * @param number - The unsigned integer.
     * @returns The bigInt representation of the input.
     */
    public static fromUint(number: number | bigint): bigint {
        return BigInt(number);
    }
}
