import { app } from "@arkecosystem/core-container";
import { Database, State } from "@arkecosystem/core-interfaces";
import delay from "delay";
import { defaults } from "../../../../packages/core-api/src/defaults";
import { plugin } from "../../../../packages/core-api/src/plugin";
import { registerWithContainer, setUpContainer } from "../../../utils/helpers/container";

import { delegates } from "../../../utils/fixtures";
import { generateRound } from "./utils/generate-round";

import { sortBy } from "@arkecosystem/utils";
import { asValue } from "awilix";

const round = generateRound(delegates.map(delegate => delegate.publicKey), 1);

const options = {
    enabled: true,
    host: "0.0.0.0",
    port: 4003,
    whitelist: ["*"],
};

const setUp = async () => {
    jest.setTimeout(60000);

    process.env.DISABLE_P2P_SERVER = "true"; // no need for p2p socket server to run

    await setUpContainer({
        exclude: [
            "@arkecosystem/core-webhooks",
            "@arkecosystem/core-forger",
            "@arkecosystem/core-json-rpc",
            "@arkecosystem/core-api",
        ],
    });

    const databaseService = app.resolvePlugin<Database.IDatabaseService>("database");
    await databaseService.connection.roundsRepository.truncate();
    await databaseService.buildWallets();
    await databaseService.saveRound(round);

    app.register("pkg.api.opts", asValue({ ...defaults, ...options }));

    await registerWithContainer(plugin, options);
    await delay(1000); // give some more time for api server to be up
};

const tearDown = async () => {
    await app.tearDown();

    await plugin.deregister(app, options);
};

const calculateRanks = async () => {
    const databaseService = app.resolvePlugin<Database.IDatabaseService>("database");

    const delegateWallets = Object.values(databaseService.walletManager.allByUsername()).sort(
        (a: State.IWallet, b: State.IWallet) => b.voteBalance.comparedTo(a.voteBalance),
    );

    sortBy(delegateWallets, "publicKey").forEach((delegate, i) => {
        const wallet = databaseService.walletManager.findByPublicKey(delegate.publicKey);
        (wallet as any).rate = i + 1;

        databaseService.walletManager.reindex(wallet);
    });
};

export { calculateRanks, setUp, tearDown };
