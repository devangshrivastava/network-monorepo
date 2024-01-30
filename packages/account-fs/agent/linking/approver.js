import * as uint8arrays from 'uint8arrays';
import { Envelope, DIDKey, Notification } from './common.js';

export class Approver {
  constructor(agent, channel, onComplete) {
    this.agent = agent
    this.channel = channel
    this.sessionKey = null
    this.state = null
    this.notification = new Notification()
    this.onComplete = onComplete
  }

  async handler(message) {
    switch (this.state) {
      case null:
        this.state = "INITIATE"
        this.initiate(message)
        break
      case "INITIATE":
        this.state = "NEGOTIATE"
        this.negotiate(message)
        this.state = "TERMINATE"
        break
      case "NEGOTIATE":
        break
      case "TERMINATE":
        break
    }
  }

  async initiate(requestDID) {
    const {sessionKey, sessionKeyMessage} = await this.generateSessionKey(requestDID)
    this.sessionKey =  sessionKey
    await this.channel.publish(sessionKeyMessage)
    return {sessionKey, sessionKeyMessage}
  }

  async negotiate(challenge) {
    const message = await Envelope.open(challenge, this.sessionKey)

    let approver = this
    this.notification.emitEvent("pinRecieved", {
      confirm: async () => { return await approver.confirm(message) },
      reject: async () => { return await approver.reject() },
      message: message
    })

    return {
      confirm: async () => { return await approver.confirm() },
      reject: async () => { return await approver.reject() },
      message: message
    }
  }

  async confirm(message) {
    console.log("message in approve#confirm", message)
    await this.onComplete.call("", message)
    const rootKey = uint8arrays.toString(await this.agent.accessKey(), 'base64pad')
    const forestCID = uint8arrays.toString(await this.agent.forestCID(), 'base64pad')
    const confirmMessage = await Envelope.pack({accessKey: rootKey, forestCID: forestCID, status: "CONFIRMED"}, this.sessionKey)
    
    await this.channel.publish(confirmMessage)
    this.notification.emitEvent("complete", "CONFIRMED")
    return confirmMessage
  }

  async reject() {
    const rejectMessage = await Envelope.pack({ status: "REJECTED" }, this.sessionKey)
    
    await this.channel.publish(rejectMessage)
    this.notification.emitEvent("complete", "REJECTED")
    return rejectMessage
  }

  async generateSessionKey(requestDID) {
    const sessionKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM', length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )

    const buffer = await crypto.subtle.exportKey("raw", sessionKey)
    const exportedSessionKey = new Uint8Array(buffer)

    const publicKey = DIDKey.DIDtoPublicKey(requestDID)
    const requesterPublicKey = await crypto.subtle.importKey(
      "spki",
      publicKey,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      [ "encrypt" ]
    )

    const arrayBuffer = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      requesterPublicKey,
      exportedSessionKey
    )
    const encryptedSessionKey = new Uint8Array(arrayBuffer)

    const data = {
      // issuer: //agentDID,
      audience: requestDID,
      sessionKey: uint8arrays.toString(exportedSessionKey, "base64pad")
    }
    const envolope = await this.agent.envelop(data)
    const encodedEnvelope = uint8arrays.fromString(JSON.stringify(envolope))

    const iv = crypto.getRandomValues(new Uint8Array(16))

    const msgBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sessionKey,
      encodedEnvelope
    )
    const msg = new Uint8Array(msgBuffer)

    const sessionKeyMessage = JSON.stringify({
      iv: uint8arrays.toString(iv, "base64pad"),
      msg: uint8arrays.toString(msg, "base64pad"),
      sessionKey: uint8arrays.toString(encryptedSessionKey, "base64pad")
    })
  
    return {
      sessionKey,
      sessionKeyMessage
    }
  }
}