// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////////

goog.module('tink.subtle.Hmac');

const Bytes = goog.require('tink.subtle.Bytes');
const InvalidArgumentsException = goog.require('tink.exception.InvalidArgumentsException');
const Mac = goog.require('tink.Mac');

/**
 * The minimum tag size.
 *
 * @const {number}
 */
const MIN_TAG_SIZE_IN_BYTES = 10;

/**
 * The minimum key size.
 *
 * @const {number}
 */
const MIN_KEY_SIZE_IN_BYTES = 16;

/**
 * Implementation of HMAC.
 *
 * @implements {Mac}
 * @public
 * @final
 */
class Hmac {
  /**
   * @param {!webCrypto.CryptoKey} key
   * @param {number} tagSize the size of the tag, must be larger than or equal to
   *     {@link MIN_TAG_SIZE_IN_BYTES}
   * @throws {InvalidArgumentsException}
   */
  constructor(key, tagSize) {
    /** @const @private {number} */
    this.tagSize_ = tagSize;

    /** @const @private {!webCrypto.CryptoKey} */
    this.key_ = key;
  }

  /**
   * @param {string} hashAlgoName accepted names are SHA-1, SHA-256 and SHA-512
   * @param {!Uint8Array} key must be longer than {@link MIN_KEY_SIZE_IN_BYTES}
   * @param {number} tagSize the size of the tag, must be larger than or equal
   *     to {@link MIN_TAG_SIZE_IN_BYTES}
   * @return {!Promise.<!Mac>}
   * @throws {InvalidArgumentsException}
   * @static
   */
  static async new(hashAlgoName, key, tagSize) {
    if (tagSize < MIN_TAG_SIZE_IN_BYTES) {
      throw new InvalidArgumentsException(
          'tag too short, must be at least ' + MIN_TAG_SIZE_IN_BYTES +
          ' bytes');
    }

    if (key.length < MIN_KEY_SIZE_IN_BYTES) {
      throw new InvalidArgumentsException(
          'key too short, must be at least ' + MIN_KEY_SIZE_IN_BYTES +
          ' bytes');
    }

    switch (hashAlgoName) {
      case 'SHA-1':
        if (tagSize > 20) {
          throw new InvalidArgumentsException(
              'tag too long, must not be larger than 20 bytes');
        }
        break;
      case 'SHA-256':
        if (tagSize > 32) {
          throw new InvalidArgumentsException(
              'tag too long, must not be larger than 32 bytes');
        }
        break;
      case 'SHA-512':
        if (tagSize > 64) {
          throw new InvalidArgumentsException(
              'tag too long, must not be larger than 64 bytes');
        }
        break;
      default:
        throw new InvalidArgumentsException(hashAlgoName + ' is not supported');
    }

    const cryptoKey = await window.crypto.subtle.importKey(
        'raw', key, {
          'name': 'HMAC',
          'hash': {'name': hashAlgoName},
          'length': key.length * 8
        },
        false, ['sign', 'verify']);
    return new Hmac(cryptoKey, tagSize);
  }

  /**
   * @override
   */
  async computeMac(data) {
    const tag =
        await window.crypto.subtle.sign({'name': 'HMAC'}, this.key_, data);
    return new Uint8Array(tag.slice(0, this.tagSize_));
  }

  /**
   * @override
   */
  async verifyMac(tag, data) {
    const computedTag = await this.computeMac(data);
    return Bytes.isEqual(tag, computedTag);
  }
}

exports = Hmac;
