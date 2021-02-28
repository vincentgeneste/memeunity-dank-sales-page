class ScriptBuilder {

    Opcode_NOP() { return 0; }
    // register
    Opcode_MOVE() { return 1; }
    Opcode_COPY() { return 2; }
    Opcode_PUSH() { return 3; }
    Opcode_POP() { return 4; }
    Opcode_SWAP() { return 5; }
    // flow
    Opcode_CALL() { return 6; }
    Opcode_EXTCALL() { return 7; }
    Opcode_JMP() { return 8; }
    Opcode_JMPIF() { return 9; }
    Opcode_JMPNOT() { return 10; }
    Opcode_RET() { return 11; }
    Opcode_THROW() { return 12; }
    // data
    Opcode_LOAD() { return 13; }
    Opcode_CAST() { return 14; }
    Opcode_CAT() { return 15; }
    Opcode_SUBSTR() { return 16; }
    Opcode_LEFT() { return 17; }
    Opcode_RIGHT() { return 18; }
    Opcode_SIZE() { return 19; }
    Opcode_COUNT() { return 20; }
    Opcode_NOT() { return 21; }
    // logical
    Opcode_AND() { return 22; }
    Opcode_OR() { return 23; }
    Opcode_XOR() { return 24; }
    Opcode_EQUAL() { return 25; }
    Opcode_LT() { return 26; }
    Opcode_GT() { return 27; }
    Opcode_LTE() { return 28; }
    Opcode_GTE() { return 29; }
    // numeric
    Opcode_INC() { return 30; }
    Opcode_DEC() { return 31; }
    Opcode_SIGN() { return 32; }
    Opcode_NEGATE() { return 33; }
    Opcode_ABS() { return 34; }
    Opcode_ADD() { return 35; }
    Opcode_SUB() { return 36; }
    Opcode_MUL() { return 37; }
    Opcode_DIV() { return 38; }
    Opcode_MOD() { return 39; }
    Opcode_SHL() { return 40; }
    Opcode_SHR() { return 41; }
    Opcode_MIN() { return 42; }
    Opcode_MAX() { return 43; }
    // context
    Opcode_THIS() { return 44; }
    Opcode_CTX() { return 45; }
    Opcode_SWITCH() { return 46; }
    // array
    Opcode_PUT() { return 47; }
    Opcode_GET() { return 48; }

    VMType_None() { return 0; }
    VMType_Struct() { return 1; }
    VMType_Bytes() { return 2; }
    VMType_Number() { return 3; }
    VMType_String() { return 4; }
    VMType_Timestamp() { return 5; }
    VMType_Bool() { return 6; }
    VMType_Enum() { return 7; }
    VMType_Object() { return 8; }

    constructor() {
        this.script = "";
        this.clearOptimizations();
    }

    // just quick dirty method to convert number to hex wih 2 digits, rewrite this later if there's a cleaner way
    raw(value) {
        let result = value.toString(16);
        if (result.length == 1) {
            result = '0' + result;
        }
        return result;
    }

    rawString(value) {
        var data = [];
        for (var i = 0; i < value.length; i++) {
            data.push(value.charCodeAt(i));
        }
        return data;
    }

    // appends a single byte to the script stream
    appendByte(value) {
        this.script = this.script + this.raw(value);
    }

    appendBytes(values) {
        for (let i = 0; i < values.length; i++) {
            this.appendByte(values[i]);
        }
    }

    appendVarInt(value) {
        if (value < 0)
            throw "negative value invalid";

        if (value < 0xFD) {
            this.appendByte(value);
        }
        else if (value <= 0xFFFF) {
            let B = (value & 0x0000ff00) >> 8;
            let A = (value & 0x000000ff);

            // TODO check if the endianess is correct, might have to reverse order of appends
            this.appendByte(0xFD);
            this.appendByte(A);
            this.appendByte(B);
        }
        else if (value <= 0xFFFFFFFF) {
            let C = (value & 0x00ff0000) >> 16;
            let B = (value & 0x0000ff00) >> 8;
            let A = (value & 0x000000ff);

            // TODO check if the endianess is correct, might have to reverse order of appends
            this.appendByte(0xFE);
            this.appendByte(A);
            this.appendByte(B);
            this.appendByte(C);
        }
        else {
            let D = (value & 0xff000000) >> 24;
            let C = (value & 0x00ff0000) >> 16;
            let B = (value & 0x0000ff00) >> 8;
            let A = (value & 0x000000ff);

            // TODO check if the endianess is correct, might have to reverse order of appends
            this.appendByte(0xFF);
            this.appendByte(A);
            this.appendByte(B);
            this.appendByte(C);
            this.appendByte(D);
        }
    }

    appendMethodArgs(args) {
        let temp_reg = 0;

        for (let i = args.length - 1; i >= 0; i--) {
            let arg = args[i];
            // NOTE the C# version does call LoadIntoReg (which internally calls emitLoad). TODO Confirm if the logic is okay
            this.emitLoad(temp_reg, arg);
            this.emitPush(temp_reg);
        }
    }

    emitOpcode(opcode) {
        this.appendByte(opcode);
        return this;
    }

    emitPush(reg) {
        this.emitOpcode(this.Opcode_PUSH());
        this.appendByte(reg);
        return this;
    }

    emitPop(reg) {
        this.emitOpcode(this.Opcode_POP());
        this.appendByte(reg);
        return this;
    }

    emitLoad(reg, obj) {
        if (typeof obj === 'string') {
            let bytes = this.rawString(obj);
            this.emitLoadEx(reg, bytes, this.VMType_String());
        }
        else
            if (obj instanceof Date) {
                // https://stackoverflow.com/questions/9756120/how-do-i-get-a-utc-timestamp-in-javascript
                let num = (obj.getTime()/* + obj.getTimezoneOffset()*60*1000*/) / 1000;

                let a = (num & 0xff000000) >> 24;
                let b = (num & 0x00ff0000) >> 16;
                let c = (num & 0x0000ff00) >> 8;
                let d = (num & 0x000000ff);

                let bytes = [d, c, b, a];
                this.emitLoadEx(reg, bytes, this.VMType_Timestamp());
            }
            else
                if (typeof obj === 'boolean') {
                    let bytes = [];
                    if (obj) {
                        bytes.push(1);
                    }
                    else {
                        bytes.push(0);
                    }
                    this.emitLoadEx(reg, bytes, this.VMType_Bool());
                }
                else
                    if (typeof obj === 'number') {
                        let bytes = this.rawString(obj.toString());
                        this.emitLoadEx(reg, bytes, this.VMType_String());
                    }
                    else if (typeof obj === 'object') {
                        this.emitLoadEx(reg, obj, this.VMType_Bytes());
                    } else {
                        throw "unsupported or uniplemented type";
                    }

        return this;
    }

    // bytes is byte array
    emitLoadEx(reg, bytes, vmtype) {
        if (!Array.isArray(bytes)) {
            throw "byte array expected";
        }

        if (bytes.length > 0xFFFF) {
            throw "tried to load too much data";
        }

        this.emitOpcode(this.Opcode_LOAD());
        this.appendByte(reg);
        this.appendByte(vmtype);

        this.appendVarInt(bytes.length);
        this.appendBytes(bytes);
        return this;
    }

    emitMethod(method, args) {
        this.appendMethodArgs(args);

        let temp_reg = 2;

        // NOTE this optimization assumes that reg 2 contains a valid method name due to this method being called multiple times
        if (this.lastMethod != method) {
            this.lastMethod = method;
            this.lastContract = null;
            this.emitLoad(temp_reg, method);
        }

        return temp_reg;
    }

    callInterop(method, args) {
        let temp_reg = this.emitMethod(method, args);
        this.emitOpcode(this.Opcode_EXTCALL());
        this.appendByte(temp_reg);
        return this;
    }

    callContract(contractName, method, args) {
        let temp_reg = this.emitMethod(method, args);
        this.emitPush(temp_reg);

        let src_reg = 0;
        let dest_reg = 1;

        // NOTE this optimization assumes that reg 1 contains a valid context for this contract due to this method being called multiple times
        if (this.lastContract != contractName) {
            this.lastContract = contractName;
            this.lastMethod = null;
            this.emitLoad(src_reg, contractName);
            this.emitOpcode(this.Opcode_CTX());
            this.appendByte(src_reg);
            this.appendByte(dest_reg);
        }

        this.emitOpcode(this.Opcode_SWITCH());
        this.appendByte(dest_reg);

        return this;
    }

    endScript() {
        this.emitOpcode(this.Opcode_RET());
        return this.script;
    }

    clearOptimizations() {
        this.lastContract = "";
        this.lastMethod = "";
    }

    nullAddress() {
        return 'S1111111111111111111111111111111111';
    }
}

class PhantasmaLink {
    constructor(dappID) {
        this.host = "localhost:7090";
        this.dapp = dappID;
        this.onLogin = function (succ) {
            // do nothing
        };
    }

    login(callback) {
        this.onLogin = callback;
        this.createSocket();
    }

    signTx(script, payload, callback) {

        console.log(script)

        if (script.length >= 65536) {
            alertbox.show('Error: script too big!');
            return;
        }

        if (payload == null) {
            payload = "";
        }
        else
            if (typeof payload === 'string') {
                // NOTE: here we convert a string into raw bytes
                let sb = new ScriptBuilder();
                let bytes = sb.rawString(payload);
                sb.appendBytes(bytes);
                // then we convert the bytes into hex, because thats what PhantasmaLink protocol expects
                payload = sb.script;
            }
            else {
                alertbox.show('Error: invalid payload');
                return;
            }

        alertbox.show('Relaying transaction to wallet...');
        console.log('Relaying transaction to wallet...')

        var that = this;
        if (script.script) {
            script = script.script
        }
        this.sendLinkRequest('signTx/mainnet/main/' + script + '/' + payload, function (result) {

            callback(result);
            if (result.success && !result.hash.error) {
                alertbox.show('Transaction successful, hash: ' + result.hash);
                console.log('Transaction successful, hash: ' + result.hash);
            }

        });

    }

    createSocket() {

        let path = "ws://" + this.host + "/phantasma";
        alertbox.show('Phantasma Link connecting...');
        console.log('Phantasma Link connecting: ' + path)
        this.socket = window.PhantasmaLinkSocket ? new PhantasmaLinkSocket() : new WebSocket(path);
        this.requestCallback = null;
        this.token = null;
        this.account = null;
        this.requestID = 0;
        var that = this;
        this.socket.onopen = function (e) {
            alertbox.show('Connection established, authorizing dapp in wallet...');
            console.log('Connection established, authorizing dapp in wallet...')
            that.sendLinkRequest('authorize/' + that.dapp, function (result) {

                if (result.success) {
                    that.token = result.token;
                    that.wallet = result.wallet;
                    alertbox.show('Authorized, obtaining account info...');
                    console.log('Authorized, obtaining account info...');
                    that.sendLinkRequest('getAccount', function (result) {
                        if (result.success) {
                            that.account = result;
                            alertbox.show('Ready, opening ' + that.dapp + ' dapp connected with ' + that.account.name + ' on ' + that.wallet + '...');
                            console.log('Ready, opening ' + that.dapp + ' dapp connected with ' + that.account.name + ' on ' + that.wallet + '...');
                        }
                        else {
                            alertbox.show('Error: could not obtain account info... Make sure you have an account currently open in ' + that.wallet + '...');
                            console.log('Error: could not obtain account info... Make sure you have an account currently open in ' + that.wallet + '...');
                            disconnectLink(true);
                        }

                        that.onLogin(result.success);
                    });
                }
                else {
                    alertbox.show('Error: authorization failed...');
                    console.log('Error: authorization failed...')
                    that.onLogin(false);
                    disconnectLink(true);
                }
            });
        };

        this.socket.onmessage = function (event) {

            if (JSON.parse(event.data).message == 'Wallet is Closed') {

                alertbox.show('Error: could not obtain account info... Make sure you have an account currently open in ' + that.wallet + '...');
                console.log('Error: could not obtain account info... Make sure you have an account currently open in ' + that.wallet + '...');
                disconnectLink(true);

            } else if (JSON.parse(event.data).message == 'not logged in') {

                alertbox.show('Error: could not obtain account info... Make sure you have an account currently open in your wallet...');
                console.log('Error: could not obtain account info... Make sure you have an account currently open in in your wallet...');
                disconnectLink(true);

            } else if (JSON.parse(event.data).message == 'A previouus request is still pending' || JSON.parse(event.data).message == 'A previous request is still pending') {

                alertbox.show('Error: you have a pending action in your wallet...');
                console.log('Error: you have a pending action in your wallet...');

            } else if (JSON.parse(event.data).message == 'user rejected') {

                alertbox.show('Error: transaction cancelled by user in ' + that.wallet + '...');
                console.log('Error: transaction cancelled by user in ' + that.wallet + '...')

            } else {

                if (JSON.parse(event.data).wallet) {
                    console.log(JSON.parse(event.data).dapp + " dapp is now connected with " + JSON.parse(event.data).wallet + '...');
                    alertbox.show(JSON.parse(event.data).dapp + " dapp is now connected with " + JSON.parse(event.data).wallet + '...');
                } else if (JSON.parse(event.data).name) {
                    console.log("Account info obtained, connected with " + JSON.parse(event.data).name + '...');
                    alertbox.show("Account info obtained, connected with " + JSON.parse(event.data).name + '...');
                } else if (JSON.parse(event.data).hash) {
                    console.log("Transaction accepted on wallet...");
                    alertbox.show("Transaction accepted on wallet...");
                } else {
                    console.log("Got Phantasma Link answer: " + JSON.parse(event.data).message);
                    alertbox.show("Got Phantasma Link answer: " + JSON.parse(event.data).message);
                }

                var obj = JSON.parse(event.data);

                var temp = that.requestCallback;
                if (temp == null) {
                    alertbox.show('Error: something bad happened...');
                    console.log('Error: something bad happened...')
                    return;
                }

                that.requestCallback = null;
                temp(obj);

            }

        };

        this.socket.onclose = function (event) {
            //if (linkDisconnected == 0) {
            if (!event.wasClean) {
                alertbox.show('Error: connection terminated...');
                console.log('Error: connection terminated...')
                //linkDisconnected = 1;
                disconnectLink(true);
            }
            //}
        };

        this.socket.onerror = function (error) {
            if (error.message !== undefined) {
                alertbox.show('Error: ' + error.message);
                console.log('Error: ' + error.message)
            }
        };
    }

    retry() {
        this.createSocket();
    }

    get dappID() {
        return this.dapp;
    }

    sendLinkRequest(request, callback) {
        console.log("Sending Phantasma Link request: " + request);

        if (this.token != null) {
            request = request + '/' + this.dapp + '/' + this.token;
        }

        this.requestID++;
        request = this.requestID + ',' + request;

        this.requestCallback = callback;
        this.socket.send(request);
    }

}

var AlertBox = function (id, option) {
    this.show = function (msg) {
        if (msg === '' || typeof msg === 'undefined' || msg === null) {
            throw '"msg parameter is empty"';
        }
        else {
            var alertArea = document.querySelector(id);
            var alertBox = document.createElement('DIV');
            var alertContent = document.createElement('DIV');
            var alertClose = document.createElement('A');
            var alertClass = this;
            alertContent.classList.add('alert-content');
            alertContent.innerText = msg;
            alertClose.classList.add('alert-close');
            alertClose.setAttribute('href', '#');
            alertBox.classList.add('alert-box');
            alertBox.appendChild(alertContent);
            if (!option.hideCloseButton || typeof option.hideCloseButton === 'undefined') {
                alertBox.appendChild(alertClose);
            }
            alertArea.appendChild(alertBox);
            alertClose.addEventListener('click', function (event) {
                event.preventDefault();
                alertClass.hide(alertBox);
            });
            if (!option.persistent) {
                var alertTimeout = setTimeout(function () {
                    alertClass.hide(alertBox);
                    clearTimeout(alertTimeout);
                }, option.closeTime);
            }
        }
    };

    this.hide = function (alertBox) {
        alertBox.classList.add('hide');
        var disperseTimeout = setTimeout(function () {
            if (alertBox.parentNode) {
                alertBox.parentNode.removeChild(alertBox);
            }
            clearTimeout(disperseTimeout);
        }, 500);
    };
};

var alertNonPersistent = document.querySelector('#alertNonPersistent');
var alertPersistent = document.querySelector('#alertPersistent');
var alertShowMessage = document.querySelector('#alertShowMessage');
var alertHiddenClose = document.querySelector('#alertHiddenClose');
var alertMessageBox = document.querySelector('#alertMessageBox');
var alertbox = new AlertBox('#alert-area', {
    closeTime: 25000,
    persistent: false,
    hideCloseButton: false
});
var alertboxPersistent = new AlertBox('#alert-area', {
    closeTime: 25000,
    persistent: true,
    hideCloseButton: false
});
var alertNoClose = new AlertBox('#alert-area', {
    closeTime: 25000,
    persistent: false,
    hideCloseButton: true
});

function disconnectLink(triggered) {

    if (triggered) {

        if (currentCallType == 'Auction') {
            $("#retry-link").html('<button data-bb-handler="confirm" type="button" class="btn btn-primary" onclick="confirmAuction(\'' + currentCall + '\')" id="retry-link"><i class="fa fa-check"></i> Retry</button>')
        } else if (currentCallType == 'Item') {
            $("#retry-link").html('<button data-bb-handler="confirm" type="button" class="btn btn-primary" onclick="confirmSale(\'' + currentCall + '\',\'' + currentCallCurrency + '\')" id="retry-link"><i class="fa fa-check"></i> Retry</button>')
        }
        $('#phantasmaError').modal('show');

    }

    console.log('Phantasma Link disconnecting...')
    alertbox.show('Phantasma Link disconnecting...');

}