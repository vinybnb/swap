Moralis.start({ serverUrl: "https://jms66zb8h4zr.moralishost.com:2053/server", appId: "QMLoVdfDAzpL4S4xoRyEtuhKjpO7fsJJLosljwm5" });
let user;
let balances = {};
let web3;
let ref = '';
let reward = 0;
let rewardTransactions = [];

const BSCSCAN_TX_URL = 'https://bscscan.com/tx/';
const DECIMALS = 5;
const NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const WBNB_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
const CASH_ADDRESS = '0x18950820a9108a47295b40b278f243dfc5d327b5';
const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const MAINNET_ID = 56; // 56 for mainnet
const GAS_PRICE = 5.8; // Gwei
const networks = {
    1: 'eth',
    4: 'rinkeby',
    56: 'bsc',
    97: 'bsc testnet',
    137: 'matic',
    80001: 'mumbai'
};

// currently, Moralis plugin doesn't support protocols parameter so we will call 1inch API directly with protocol PANCAKESWAP_V2. Because without protocols parameter, the 1inch API return wrong price when the amount is <= 1 usdt due to the fee is often > 1usdt. And the important thing is the price from 1Inch without protocols parameter is average price from many dexes so and we want it to be the same with pancakeswap.

setInterval(function(){ 
    loadCashPrice();
}, 5000);

async function init(){
    await Moralis.initPlugins();
    dex = Moralis.Plugins.oneInch;
    await renderInterface();
    const options = {
        delay: 5000,
    };
    $('.copy-toast-container .toast').toast(options);

    const infoOptions = {
        delay: 20000,
    }
    $('.info-toast-container .toast').toast(infoOptions);
}

$('.copy-toast-container .toast').on('hidden.bs.toast', function () {
    $('.copy-toast-container').css("z-index", "-1");
});

$('.info-toast-container .toast').on('hidden.bs.toast', function () {
    $('.info-toast-container').css("z-index", "-1");
});

async function loadCashPrice() {
    const options = {
        address: CASH_ADDRESS,
        chain: "bsc",
        exchange: "PancakeSwapv2"
    };
    const cashPrice = await Moralis.Web3API.token.getTokenPrice(options);
    $('#cash_price').text(Number(cashPrice.usdPrice.toFixed(DECIMALS)));
}

async function renderInterface() {
    user = Moralis.User.current();
    if (user) {
        document.getElementById("connect_wallet_button").hidden = true;
        document.getElementById("logout_button").hidden = false;
        document.getElementById("refer_not_connected").hidden = true;
        document.getElementById("refer_connected").hidden = false;

        $('#address').text(shortenAddress(user.get("ethAddress")));
        $('#address').show(user.get("ethAddress"));
        await enabledMoralisWeb3();
        networkId = await Moralis.web3.eth.net.getId();
        if (networkId != MAINNET_ID) {
            $('.info-toast-container .info-body').html('Please switch to Binance Smart Chain Wallet');
            $('.info-toast-container').css("z-index", "1");
            $('.info-toast-container .toast').toast('show');
            logOut();
        } else {
            await getReward();
            $('#reward').text(formatNumber(Number(reward.toFixed(DECIMALS))));
            displayTransactions();
            const results = await Moralis.Cloud.run("getRef", { address: user.get("ethAddress") });
            if (results.status == 'success') {
                ref = results.ref;
                $('#ref').val('https://swap.caash.io?ref=' + ref);
            } else {
                ref = '';
            }
        }
    } else {
        document.getElementById("connect_wallet_button").hidden = false;
        document.getElementById("logout_button").hidden = true;
        document.getElementById("refer_not_connected").hidden = false;
        document.getElementById("refer_connected").hidden = true;
        $('#address').text('');
        $('#address').hide();
    }
}

function shortenAddress(address) {
    return address.substring(0, 6) + '...' + address.substring(address.length - 5, address.length);
}

async function connectWallet(provider) {
    let user = Moralis.User.current();
    $('#wallets_modal').modal('hide');
    if (!user) {
        switch (provider) {
            case 'metamask':
                user = await Moralis.authenticate();
                window.localStorage.setItem('provider', 'metamask');
                break;
            case 'trustwallet':
                user = await Moralis.authenticate();
                window.localStorage.setItem('provider', 'trustwallet');
                break;
            case 'walletconnect':
                user = await Moralis.authenticate({ provider: provider });
                window.localStorage.setItem('provider', 'walletconnect');
                break;
            default:
                break;
        }
    }
    await renderInterface();
}

async function getReward() {
    const results = await Moralis.Cloud.run("getReward", { address: user.get("ethAddress") });
    if (results.status == 'success') {
        reward = results.reward;
        rewardTransactions = results.rewardTransactions;
    } else {
        reward = 0;
        rewardTransactions = [];
    }
}

function displayTransactions() {
    if (rewardTransactions.length === 0) {
        $('#rewards').html('No transactions found!');
    } else {
        $('#rewards').html('');
        let transactionsHtml = '<table class="table rewards_table">';
        let i = 1;
        for (const rewardTransaction of rewardTransactions) {
            let transactionItem = '<tr>';
            transactionItem += `<td>#${i}</td>`;
            transactionItem += `<td class="transaction_link"><a href="${BSCSCAN_TX_URL + rewardTransaction.transactionHash}" target="_blank">${shortenAddress(rewardTransaction.transactionHash)}</a></td>`;
            transactionItem += `<td class="d-flex justify-content-end transaction_reward">${rewardTransaction.reward} CASH</td>`;
            transactionItem += '</tr>';
            transactionsHtml += transactionItem;
            i++;
        }
        transactionsHtml += '</table>';
        $('#rewards').html(transactionsHtml);
    }
}

async function enabledMoralisWeb3() {
    const provider = window.localStorage.getItem('provider');
    switch (provider) {
        case 'walletconnect':
            web3 = await Moralis.enable({ provider: provider });
            break;
        default:
            web3 = await Moralis.enable();
            break;
    }
}

async function logOut() {
    await Moralis.User.logOut();
    window.localStorage.removeItem('provider');
    await renderInterface();
}

function copy() {
    /* Get the text field */
    var copyText = document.getElementById("ref");
  
    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */
  
    /* Copy the text inside the text field */
    navigator.clipboard.writeText(copyText.value);

    $('.copy-toast-container').css("z-index", "1");
    $('.copy-toast-container .toast').toast('show');
}

function formatNumber(number) {
    if (!isNaN(number)) {
        number = number.toString();
    }
    const dotPosition = number.indexOf('.');
    if (dotPosition === -1) {
        return number + '.00';
    } else if (dotPosition === number.length - 2) {
        return number + '0';
    }

    return number;
}

init();

document.getElementById("logout_button").onclick = logOut;
