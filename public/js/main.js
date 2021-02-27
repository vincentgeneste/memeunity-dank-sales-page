var softcap = 250000;
var hardcap = 600000;

const contractAddress = 'P2K43AZNup3nBhZUSBzX81sQU41GRUC9bHXXZmWE5AhZDQn'

$(document).ready(function () {
    var reached = 0;

    $.get('https://seed.ghostdevs.com:7078/api/getAccount?account=' + contractAddress,
    function (res) {                        
        res = JSON.parse(res);
        if (res && res.error) {
            console.log(res.error)
        } else {
            var soulBalance = res.balances.find(b => b.symbol == 'SOUL');
            if (soulBalance) {
                var amount = soulBalance.amount;
                var decimals = 8;
                while (amount.length < decimals + 1) amount = "0" + amount;            
                reached = parseInt(amount.substring(0, amount.length - decimals));
                $("#reached").html(numberWithCommas(reached, 0));

                // calculate progress
                var progress = (100 * reached) / hardcap;
                if (progress > 100)
                    progress = 100;
                $(".progress").css("width",  progress.toFixed(3)+ "%");

            }
        }
    });

    // calculate progress
    $(".progress").css("width", (100 * reached) / hardcap + "%");

    // set softcap pos
    $("#softcap-mark").css("left", (100 * softcap) / hardcap + "%");
    $("#hardcap").html(numberWithCommas(hardcap, 0));
});

function login() {

    link = new PhantasmaLink("MemeUnity Sales");

    link.login(function (success) {

        if (success) {

            linkWallet = link.wallet
            linkAddress = link.account.address
            linkName = link.account.name
            linkBalances = link.account.balances
            linkBalSOUL = 0
            linkBalKCAL = 0

            linkBalancesSOUL = linkBalances.filter(function (el) {
                return el.symbol == 'SOUL';
            });
            if (linkBalancesSOUL.length > 0) {
                linkBalSOUL = linkBalancesSOUL[0].value / (Math.pow(10, linkBalancesSOUL[0].decimals));
            }
            linkBalancesKCAL = linkBalances.filter(function (el) {
                return el.symbol == 'KCAL';
            });
            if (linkBalancesKCAL.length > 0) {
                linkBalKCAL = linkBalancesKCAL[0].value / (Math.pow(10, linkBalancesKCAL[0].decimals));
            }

            if (parseFloat(linkBalKCAL) < 0.1 && parseFloat(linkBalKCAL) > 0) {
                bootbox.alert("Not enough KCAL available. You need at least 0.1 KCAL to perform a transaction!");
                return;
            }

            contentBootbox = 'Connected wallet: ' + linkName + ' • ' + formatAddressShort(linkAddress)
                + '<br>SOUL balance: ' + parseFloat(linkBalSOUL).toFixed(0) + ' SOUL'
                + '<br><br>How much SOUL do you want to contribute to the sale?'
                + '<br><br><input type="text" class="form-control" name="amountsale" id="amountsale"><br>'
                + "Note: you have to be whitelisted with your address or your transaction will be refunded."

            dialog = bootbox.confirm({
                title: "Sale participation confirmation",
                message: contentBootbox,
                buttons: {
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel',
                        className: 'btn btn-default'
                    },
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm transaction',
                        className: 'btn btn-primary buy-confirm'
                    }
                },
                callback: function (result) {

                    if (result) {

                        results = {};
                        results.fieldname1 = dialog[0].querySelector("[name=amountsale]").value;
                        sendAmount = results.fieldname1
                        if (sendAmount < 1250) {
                            bootbox.alert('Amount too low!<br>You need to participate with at least 1,250 SOUL');
                            return;
                        }
                        if (sendAmount > 60000) {
                            bootbox.alert('Amount too high!<br>You can participate only up to 60,000 SOUL');
                            return;
                        }

                        send(sendAmount)

                    } else {

                    }

                }
            })

        }

    })

}

function formatAddressShort(address) {

    if (!address) return ''
    const lastFiveChar = address.substr(address.length - 5)
    const firstFiveChar = address.substr(0, 5)
    const addressFormated = firstFiveChar + '...' + lastFiveChar
    return addressFormated

}

function numberWithCommas(x, decimals) {
    decimals = typeof decimals == "undefined" ? 2 : decimals;
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (decimals == 0) 
        return parts[0];
    if (parts.length > 1 && parts[1].length > decimals)
        return parts[0] + "." + parts[1].substr(0, decimals);
    return parts.join(".")

}

function send(sendAmount) {

    const assetSymbol = 'SOUL'
    const gasPrice = 100000;
    const minGasLimit = 2100;

    console.log(
        "sending",
        Math.floor(sendAmount),
        " ",
        assetSymbol,
        "to",
        contractAddress
    );

    sb = new ScriptBuilder();

    paramArrayTransfer = [linkAddress, contractAddress, assetSymbol, Math.floor(sendAmount * 10 ** 8)];

    script = sb.callContract('gas', 'AllowGas', [linkAddress, sb.nullAddress(), gasPrice, minGasLimit])
        .callInterop('Runtime.TransferTokens', paramArrayTransfer)
        .callContract('gas', 'SpendGas', [linkAddress])
        .endScript();

    link.signTx(script, null, function (result) {
        console.log('result signTx', result)

        if (result.error || result.hash.error) {
            var error = result.error ? result.error : result.hash.error;
            console.log(error)
            bootbox.alert('Error: ' + error);
        }
        else if (result.success) {
            var hash = result.hash;

            setTimeout(function() {
                $.get('https://seed.ghostdevs.com:7078/api/getTransaction?hashText=' + hash,
                    function (res) {                        
                        console.log(res)
                        res = JSON.parse(res);
                        if (
                            res &&
                            res.error &&
                            res.error !== 'pending'
                        ) {
                            console.log(res.error)
                            bootbox.alert('error: ' + res.error);
                        } else {
                            console.log('tx successful: ', res.hash)
                            bootbox.alert('success, tx hash: ' + res.hash);
                        }
                    })
                }, 2000);
        }

    })

}