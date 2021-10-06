Moralis.initialize("QMLoVdfDAzpL4S4xoRyEtuhKjpO7fsJJLosljwm5");
Moralis.serverURL = "https://jms66zb8h4zr.moralishost.com:2053/server";

const chainToQuery = 'bsc'

let currentTrade = {};
let currentSelectSide;
let tokens;
let user;
let balances = {};
const NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
let dex;
let web3;
const MAINNET_ID = 56; // We will switch to 56 for mainnet
const networks = {
    1: 'eth',
    4: 'rinkeby',
    56: 'bsc',
    97: 'bsc testnet',
    137: 'matic',
    80001: 'mumbai'
};

async function init(){
    await Moralis.initPlugins();
    await Moralis.enable();
    dex = Moralis.Plugins.oneInch;
    await listAvailableTokens();
    renderInterface();
}

async function listAvailableTokens(){
    const result = await dex.getSupportedTokens({
        chain: 'bsc', // The blockchain you want to use (eth/bsc/polygon)
    });
    tokens = result.tokens;
    tokens['0x18950820A9108A47295b40B278F243DfC5D327B5'] = {
        symbol: 'CASH',
        name: 'Caash',
        decimals: 18,
        address: '0x18950820A9108A47295b40B278F243DfC5D327B5',
        logoURI: 'https://bscscan.com/token/images/caashme_32.png'
    }
    showTokensList(tokens);
}

function showTokensList(filteredTokens) {
    let parent = document.getElementById("token_list");
    $(parent).html('');
    for (const address in filteredTokens) {
        let token = filteredTokens[address];
        let div = document.createElement("div");
        div.setAttribute("data-address", address)
        div.className = "token_row";
        let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `
        div.innerHTML = html;
        div.onclick = (() => {selectToken(address)});
        parent.appendChild(div);
    }
}

function selectToken(address){
    closeModal();
    currentTrade[currentSelectSide] = tokens[address];
    renderSwapInfo();
    getQuote();
}

async function renderInterface() {
    user = Moralis.User.current();
    if (user) {
        document.getElementById("swap_button").disabled = false;
        document.getElementById("login_button").hidden = true;
        document.getElementById("logout_button").hidden = false;
        $('#address').text(shortenAddress(user.get("ethAddress")));
        $('#address').show(user.get("ethAddress"));
        web3 = await Moralis.enable();
        networkId = await Moralis.web3.eth.net.getId();
        if (networkId != MAINNET_ID) {
            alert('Please switch to Binance Smart Chain Wallet');
            logOut();
        } else {
            getBalances();
        }
    } else {
        document.getElementById("swap_button").disabled = true;
        document.getElementById("login_button").hidden = false;
        document.getElementById("logout_button").hidden = true;
        $('#address').text('');
        $('#address').hide();
    }
}

function filterTokens() {
    const keyword = $('#token_search_input').val();
    const filteredTokens = Object.keys(tokens)
        .filter(key => (key === keyword || tokens[key].symbol.toLowerCase().includes(keyword.toLowerCase())))
        .reduce((obj, key) => {
            obj[key] = tokens[key];
            return obj;
        }, {});
    showTokensList(filteredTokens);
}

async function renderSwapInfo() {
    if(currentTrade.from){
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
        let tokenInBalance = 0;
        if (balances[currentTrade.from.address] !== undefined) {
            tokenInBalance = balances[currentTrade.from.address].balance / (10 ** balances[currentTrade.from.address].decimals) || 0;
        }
        tokenInBalance = tokenInBalance.toFixed(6);
        $('#token_in_balance').text(`${tokenInBalance} ${currentTrade.from.symbol}`);
    }

    if(currentTrade.to){
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
        let tokenOutBalance = 0;
        if (balances[currentTrade.to.address] !== undefined) {
            tokenOutBalance = balances[currentTrade.to.address].balance / (10 ** balances[currentTrade.to.address].decimals) || 0;
        }
        tokenOutBalance = tokenOutBalance.toFixed(6);
        $('#token_out_balance').text(`${tokenOutBalance} ${currentTrade.to.symbol}`);
    }
}

async function getBalances() {
    const options = { chain: networks[MAINNET_ID] }
    balances[NATIVE_ADDRESS] = tokens[NATIVE_ADDRESS]
    const nativeBalance = await Moralis.Web3API.account.getNativeBalance(options);
    balances[NATIVE_ADDRESS].balance = nativeBalance.balance;
    const tokenBalances = await Moralis.Web3API.account.getTokenBalances(options);
    for (let tokenBalance of tokenBalances) {
        balances[tokenBalance.token_address] = tokenBalance; 
    }
}

function shortenAddress(address) {
    return address.substring(0, 6) + '...' + address.substring(address.length - 5, address.length);
}

async function login() {
    user = Moralis.User.current();
    if (!user) {
        user = await Moralis.Web3.authenticate();
    }
  
    renderInterface();
}

async function logOut() {
    await Moralis.User.logOut();
    renderInterface();
}

function openModal(side){
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}
function closeModal(){
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
    const amount = parseFloat($('#from_amount').val());
    if(!currentTrade.from || !currentTrade.to || isNaN(amount) || amount == 0) {
        $('#gas_estimate').text('0.00');
        $('#to_amount').val('0.00');
        return;
    }
    $('#gas_estimate').text("calculating...");
    $('#to_amount').val("calculating...");
    
    console.log(amount);

    const quote = await dex.quote({
        chain: 'bsc', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        toTokenAddress: currentTrade.to.address, // The token you want to receive
        amount: amount,
    })

    console.log(quote);
    $('#gas_estimate').text(quote.estimatedGas);
    $('#to_amount').val(quote.toTokenAmount);
}

async function trySwap(){
    let address = Moralis.User.current().get("ethAddress");
    let amount = Number( 
        document.getElementById("from_amount").value * 10**currentTrade.from.decimals 
    )
    if(currentTrade.from.symbol !== "ETH"){
        const allowance = await dex.hasAllowance({
            chain: 'bsc', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.from.address, // The token you want to swap
            fromAddress: address, // Your wallet address
            amount: amount,
        })
        console.log(allowance);
        if(!allowance){
            await dex.approve({
                chain: 'bsc', // The blockchain you want to use (eth/bsc/polygon)
                tokenAddress: currentTrade.from.address, // The token you want to swap
                fromAddress: address, // Your wallet address
              });
        }
    }
    try {
        let recept = await dex.swap({
            chain: 'bsc', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.from.address, // The token you want to swap
            toTokenAddress: currentTrade.to.address, // The token you want to receive
            amount: amount,
            fromAddress: address, // Your wallet address
            slippage: parseInt($('#slippage').text()),
        });
        console.log(recept);
        alert("Swap Complete");
    
    } catch (error) {
        console.log(error);
    }
}

init();

document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_token_select").onclick = (() => {openModal("from")});
document.getElementById("to_token_select").onclick = (() => {openModal("to")});
document.getElementById("login_button").onclick = login;
document.getElementById("logout_button").onclick = logOut;
document.getElementById("from_amount").onkeyup = getQuote;
document.getElementById("swap_button").onclick = trySwap;
document.getElementById("token_search_input").onkeyup = filterTokens;
