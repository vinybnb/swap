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
    } else {
        return { "status": "error", "message": "Cannot found user" };
    }
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
