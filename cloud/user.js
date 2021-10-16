const REF_LENGTH = 6;

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

function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}
