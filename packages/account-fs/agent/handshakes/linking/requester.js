import { Requester } from '../base/requester.js';

export class LinkingRequester extends Requester {
  async challenge() {
    const pin = Array.from(crypto.getRandomValues(new Uint8Array(6))).map(n => n % 9)
    return {pin: pin}
  }
}