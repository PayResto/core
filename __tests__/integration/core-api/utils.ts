import "jest-extended";

import { app } from "@arkecosystem/core-container";
import { httpie } from "@arkecosystem/core-utils";
import { Managers, Transactions } from "@arkecosystem/crypto";
import { ApiHelpers } from "../../utils/helpers/api";

class Helpers {
    public async request(method, path, params = {}) {
        return ApiHelpers.request(
            app.resolvePlugin("api").http,
            method,
            `http://localhost:4003/api/${path}`,
            {
                "Content-Type": "application/json",
            },
            params,
        );
    }

    public expectJson(response) {
        expect(response.data).toBeObject();
    }

    public expectStatus(response, code) {
        expect(response.status).toBe(code);
    }

    public expectResource(response) {
        expect(response.data.data).toBeObject();
    }

    public expectCollection(response) {
        expect(Array.isArray(response.data.data)).toBe(true);
    }

    public expectPaginator(response) {
        expect(response.data.meta).toBeObject();
        expect(response.data.meta).toHaveProperty("count");
        expect(response.data.meta).toHaveProperty("pageCount");
        expect(response.data.meta).toHaveProperty("totalCount");
        expect(response.data.meta).toHaveProperty("next");
        expect(response.data.meta).toHaveProperty("previous");
        expect(response.data.meta).toHaveProperty("self");
        expect(response.data.meta).toHaveProperty("first");
        expect(response.data.meta).toHaveProperty("last");
    }

    public expectSuccessful(response, statusCode = 200) {
        this.expectStatus(response, statusCode);
        this.expectJson(response);
    }

    public expectError(response, statusCode = 404) {
        this.expectStatus(response, statusCode);
        this.expectJson(response);
        expect(response.data.statusCode).toBeNumber();
        expect(response.data.error).toBeString();
        expect(response.data.message).toBeString();
    }

    public expectTransaction(transaction) {
        expect(transaction).toBeObject();
        expect(transaction).toHaveProperty("id");
        expect(transaction).toHaveProperty("blockId");
        expect(transaction).toHaveProperty("type");
        expect(transaction).toHaveProperty("amount");
        expect(transaction).toHaveProperty("fee");
        expect(transaction).toHaveProperty("sender");

        if ([1, 2].indexOf(transaction.type) === -1) {
            expect(transaction.recipient).toBeString();
        }

        expect(transaction.signature).toBeString();
        expect(transaction.confirmations).toBeNumber();
    }

    public expectBlock(block, expected: any = {}) {
        expect(block).toBeObject();
        expect(block.id).toBeString();
        expect(block.version).toBeNumber();
        expect(block.height).toBeNumber();
        expect(block).toHaveProperty("previous"); // `undefined` or String
        expect(block).toHaveProperty("forged");
        expect(block.forged.reward).toBeNumber();
        expect(block.forged.fee).toBeNumber();
        expect(block.forged.total).toBeNumber();
        expect(block.forged.amount).toBeNumber();
        expect(block).toHaveProperty("payload");
        expect(block.payload.length).toBeNumber();
        expect(block.payload.hash).toBeString();
        expect(block).toHaveProperty("generator");
        expect(block.generator.publicKey).toBeString();
        expect(block.signature).toBeString();
        expect(block.transactions).toBeNumber();

        Object.keys(expected || {}).forEach(attr => {
            expect(block[attr]).toEqual(expected[attr]);
        });
    }

    public expectDelegate(delegate, expected: any = {}) {
        expect(delegate).toBeObject();
        expect(delegate.username).toBeString();
        expect(delegate.address).toBeString();
        expect(delegate.publicKey).toBeString();
        expect(delegate.votes).toBeNumber();
        expect(delegate.rank).toBeNumber();
        expect(delegate.blocks).toBeObject();
        expect(delegate.blocks.produced).toBeNumber();
        expect(delegate.production).toBeObject();
        expect(delegate.production.approval).toBeNumber();
        expect(delegate.forged.fees).toBeNumber();
        expect(delegate.forged.rewards).toBeNumber();
        expect(delegate.forged.total).toBeNumber();

        Object.keys(expected || {}).forEach(attr => {
            expect(delegate[attr]).toBe(expected[attr]);
        });
    }

    public expectWallet(wallet) {
        expect(wallet).toBeObject();
        expect(wallet).toHaveProperty("address");
        expect(wallet).toHaveProperty("publicKey");
        expect(wallet).toHaveProperty("balance");
        expect(wallet).toHaveProperty("isDelegate");
        expect(wallet).toHaveProperty("vote");
    }

    public async createTransaction() {
        Managers.configManager.setConfig(Managers.NetworkManager.findByName("testnet"));

        const transaction = Transactions.BuilderFactory.transfer()
            .amount("100000000")
            .recipientId("AZFEPTWnn2Sn8wDZgCRF8ohwKkrmk2AZi1")
            .vendorField("test")
            .sign("clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire")
            .getStruct();

        await httpie.post("http://127.0.0.1:4003/api/transactions", {
            body: {
                transactions: [transaction],
            },
            headers: { "Content-Type": "application/json" },
        });

        return transaction;
    }
}

export const utils = new Helpers();
