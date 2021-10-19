const REF_LENGTH = 6;
const API_KEY = "5GvaXZVLWRrTNJIc6A1kllNH4hUf4JSM4QSLaKvNY1jcoI9bgYpveZDzIGuG9RIG";
const API_1INCH_BASE = "https://api.1inch.exchange/v3.0/56/";
const NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const CASH_ADDRESS = '0x18950820a9108a47295b40b278f243dfc5d327b5';
const DECIMALS = 5;

Moralis.Cloud.define("getRef", async (request) => {
    const User = Moralis.Object.extend("User");
    const query = new Moralis.Query(User);
    query.equalTo("ethAddress", request.params.address);
    const user = await query.first({ useMasterKey: true });
    if (user) {
        if (user.attributes.ref) {
            return { "status": "success", "ref": user.attributes.ref };
        } else {
            const refsQuery = new Moralis.Query(User);
            refsQuery.notEqualTo("ref", null);
            const refs = [];
            const users = await refsQuery.find({ useMasterKey: true });
            for (let i = 0; i < users.length; i++) {
                refs.push(users[i].attributes.ref);
            }
            do {
                const ref = makeid(REF_LENGTH);
                if (!refs.includes(ref)) {
                    user.set('ref', ref);
                    user.save(null, { useMasterKey: true });

                    return { "status": "success", "ref": ref };
                }
            } while (true);
        }
    }

    return { "status": "error", "message": "User not found" };
});

Moralis.Cloud.define("getReference", async (request) => {
    const User = Moralis.Object.extend("User");
    const query = new Moralis.Query(User);
    query.equalTo("ethAddress", request.params.address);
    const user = await query.first({ useMasterKey: true });
    if (user && user.attributes.reference) {
        return { "status": "success", "reference": user.attributes.reference };
    }

    return { "status": "success", "reference": null };
});

Moralis.Cloud.define("setReference", async (request) => {
    if (!request.params.reference) {
        return { "status": "error", "message": "Empty reference" };
    }
    const User = Moralis.Object.extend("User");
    const query = new Moralis.Query(User);
    query.equalTo("ethAddress", request.params.address);
    const user = await query.first({ useMasterKey: true });
    if (user) {
        if (user.attributes.reference) {
            // return current reference in the DB, no matter what the value of the reference param is
            return { "status": "success", "reference": user.attributes.reference };
        }
        // check there is a ref value in the DB equals to the reference param, if yes, we will update this value. Otherwise, we will return error
        // we also prevent user to set himeself as the reference
        const refsQuery = new Moralis.Query(User);
        refsQuery.equalTo("ref", request.params.reference);
        const referenceUser = await refsQuery.first({ useMasterKey: true });
        if (referenceUser && request.params.reference != user.attributes.ref) {
            user.set('reference', request.params.reference);
            user.save(null, { useMasterKey: true });
            
            return { "status": "success", "reference": request.params.reference };
        }
        
        return { "status": "error", "message": "Invalid reference" };
    }

    return { "status": "error", "message": "User not found" };
});

Moralis.Cloud.define("getReward", async (request) => {
    const User = Moralis.Object.extend("User");
    const query = new Moralis.Query(User);
    query.equalTo("ethAddress", request.params.address);
    const user = await query.first({ useMasterKey: true });
    if (user && user.attributes.reward) {
        return { "status": "success", "reward": user.attributes.reward };
    }

    return { "status": "success", "reward": 0 };
});

Moralis.Cloud.define("rewardReference", async (request) => {
    const User = Moralis.Object.extend("User");
    const query = new Moralis.Query(User);
    query.equalTo("ethAddress", request.params.address);
    const user = await query.first({ useMasterKey: true });
    if (user && user.attributes.reference) {
        const referenceQuery = new Moralis.Query(User);
        referenceQuery.equalTo("ref", user.attributes.reference);
        const referenceUser = await referenceQuery.first({ useMasterKey: true });
        if (referenceUser) {
            const web3 = Moralis.web3ByChain("0x38");
            const transaction = await web3.eth.getTransaction(request.params.transactionHash);
            // make sure the from address of the transaction is the same as the user address.
            if (transaction && transaction.from.toLowerCase() === request.params.address.toLowerCase()) {
                const block = await web3.eth.getBlock(transaction.blockHash);
                const timeDiff = Math.floor(Date.now() / 1000) - block.timestamp;
                // We will only allow transactions no more than 2 minutes ago
                // for prevent users use old transactions to earn rewards.
                if (timeDiff <= 120) {
                    const value = transaction.value;
                    if (value > 0) {
                        const url = `${API_1INCH_BASE}quote?fromTokenAddress=${NATIVE_ADDRESS}&toTokenAddress=${CASH_ADDRESS}&amount=${value}&protocols=PANCAKESWAP_V2`;
                        const response = await Moralis.Cloud.httpRequest({
                            "url": url,
                            "headers": {
                                'method': 'GET',
                                'accept': 'application/json'
                            }
                        });

                        if (response.status == 'success') {
                            // reward 0.1% BNB value
                            const cashRewardAmount = response.data.toTokenAmount / (10 ** 21);
                            const reward = Number(cashRewardAmount.toFixed(DECIMALS));
                            const updatedReward = (referenceUser.attributes.reward || 0) + reward;
                            const updatedTotalReward = (referenceUser.attributes.totalReward || 0) + reward;
                            referenceUser.set('reward', updatedReward);
                            referenceUser.set('totalReward', updatedTotalReward);
                            referenceUser.save(null, { useMasterKey: true });

                            return { "status": "success", "reward": reward,  "updatedReward": updatedReward, "updatedTotalReward": updatedTotalReward };
                        }
                    }
                }
            }
        }

        return { "status": "error", "message": "Update reward failed!" };
    }


    const res = await Moralis.web3.eth.getTransaction("0xdb065a91998b6ff9fc407c9946837a5194969cf1b6e07aff1ae3cb448630212b");
    console.log('res', res);
    const res2 = await Moralis.web3.eth.getBlock("0xd828c8aa3eda80848708ad7cfb5c12207af8296ca1dbbcfec3c1a26551e9693a");
    console.log('res2', res2);
    console.log((Math.floor(Date.now() / 1000) - res2.timestamp) > 300);

    return { "status": "success", "reward": 0 };
});

function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}
