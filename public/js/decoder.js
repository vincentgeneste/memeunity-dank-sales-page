class Decoder {
  constructor(str) {
    this.str = str;
  }

  readCharPair() {
    const res = this.str.substr(0, 2);
    this.str = this.str.slice(2);
    return res;
  }

  readByte() {
    return parseInt(this.readCharPair(), 16);
  }

  read(numBytes) {
    const res = this.str.substr(0, numBytes * 2);
    this.str = this.str.slice(numBytes * 2);
    return res;
  }

  readString() {
    const len = this.readVarInt();
    return this.readStringBytes(len);
  }

  readStringBytes(numBytes) {
    let res = "";
    for (let i = 0; i < numBytes; ++i) {
      res += String.fromCharCode(this.readByte());
    }
    return res;
  }

  readVarInt() {
    const len = this.readByte();
    let res = 0;
    if (len === 0x0fd) {
      [...this.read(2).match(/.{1,2}/g)]
        .reverse()
        .forEach((c) => (res = res * 256 + parseInt(c, 16)));
      return res;
    } else if (len === 0xfe) {
      [...this.read(4).match(/.{1,2}/g)]
        .reverse()
        .forEach((c) => (res = res * 256 + parseInt(c, 16)));
      return res;
    } else if (len === 0xff) {
      [...this.read(8).match(/.{1,2}/g)]
        .reverse()
        .forEach((c) => (res = res * 256 + parseInt(c, 16)));
      return res;
    }
    return len;
  }

  readBigInt() {
    // TO DO: implement negative numbers
    const len = this.readVarInt();
    let res = 0;
    const stringBytes = this.read(len);
    [...stringBytes.match(/.{1,2}/g)]
      .reverse()
      .forEach((c) => (res = res * 256 + parseInt(c, 16)));
    return res;
  }

  readBigIntAccurate() {
    const len = this.readVarInt();
    let res = bigInt();
    const stringBytes = this.read(len);
    [...stringBytes.match(/.{1,2}/g)].reverse().forEach((c) => {
      res = res.times(256).plus(parseInt(c, 16));
    });
    return res.toString();
  }

  readVmObject() {
    const type = this.readByte();
    switch (type) {
      case VMType.String:
        return this.readString();
      case VMType.Number:
        return this.readBigIntAccurate();
      default:
        return "unsupported type " + type;
    }
  }
}
