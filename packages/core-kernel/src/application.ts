import { existsSync, removeSync, writeFileSync } from "fs-extra";
import camelCase from "lodash/camelCase";
import { join } from "path";
import * as Bootstrappers from "./bootstrap";
import { ConfigFactory, ConfigRepository } from "./config";
import { Container } from "./container";
import { Blockchain, EventEmitter, Kernel, P2P, TransactionPool } from "./contracts";
import { DirectoryNotFound } from "./errors";
import { AbstractServiceProvider } from "./support";

export class Application extends Container {
    /**
     * Holds the providers that have been registered.
     */
    public readonly providers: Set<AbstractServiceProvider> = new Set<AbstractServiceProvider>();

    /**
     * Indicates if the application has been bootstrapped.
     */
    private bootstrapped: boolean = false;

    /**
     * Boot the application's service providers.
     */
    public bootstrap(config: Record<string, any>): void {
        this.bindConfiguration(config);

        this.bindPathsInContainer();

        this.registerBindings();

        this.registerNamespace();

        this.registerServiceProviders();

        this.bootstrapped = true;
    }

    /**
     * Boot the application.
     */
    public boot(): void {
        this.registerServiceProviders();
    }

    /**
     * Reboot the application.
     */
    public reboot(): void {
        this.terminate();

        this.registerServiceProviders();
    }

    /**
     * Get an instance of the application logger.
     */
    public get logger(): Kernel.ILogger {
        return this.resolve<Kernel.ILogger>("logger");
    }

    /**
     * Get an instance of the application blockchain.
     */
    public get blockchain(): Blockchain.IBlockchain {
        return this.resolve<Blockchain.IBlockchain>("blockchain");
    }

    /**
     * Get an instance of the application p2p layer.
     */
    public get p2p(): P2P.IMonitor {
        return this.resolve<P2P.IMonitor>("p2p");
    }

    /**
     * Get an instance of the application transaction pool.
     */
    public get transactionPool(): TransactionPool.ITransactionPool {
        return this.resolve<TransactionPool.ITransactionPool>("transactionPool");
    }

    /**
     * Get an instance of the application emitter.
     */
    public get emitter(): EventEmitter.EventEmitter {
        return this.resolve<EventEmitter.EventEmitter>("event-emitter");
    }

    /**
     * Get or set the specified configuration value.
     */
    public config<T = any>(key: string, value?: T): T {
        if (value) {
            this.resolve("config").set(key, value);
        }

        return this.resolve("config").get(key);
    }

    /**
     * Get the namespace number of the application.
     */
    public namespace(): string {
        return this.resolve("app.namespace");
    }

    /**
     * Get the version number of the application.
     */
    public version(): string {
        return this.resolve("app.version");
    }

    /**
     * Get the current application token.
     */
    public token(): string {
        return this.resolve("app.token");
    }

    /**
     * Get the current application network.
     */
    public network(): string {
        return this.resolve("app.network");
    }

    /**
     * Set the current application network.
     */
    public useNetwork(value: string): void {
        this.bind("app.network", value);
    }

    /**
     * Get the path to the data directory.
     */
    public dataPath(path: string = ""): string {
        return join(this.getPath("data"), path);
    }

    /**
     * Set the data directory.
     */
    public useDataPath(path: string): void {
        this.usePath("data", path);
    }

    /**
     * Get the path to the config directory.
     */
    public configPath(path: string = ""): string {
        return join(this.getPath("config"), path);
    }

    /**
     * Set the config directory.
     */
    public useConfigPath(path: string): void {
        this.usePath("config", path);
    }

    /**
     * Get the path to the cache directory.
     */
    public cachePath(path: string = ""): string {
        return join(this.getPath("cache"), path);
    }

    /**
     * Set the cache directory.
     */
    public useCachePath(path: string): void {
        this.usePath("cache", path);
    }

    /**
     * Get the path to the log directory.
     */
    public logPath(path: string = ""): string {
        return join(this.getPath("log"), path);
    }

    /**
     * Set the log directory.
     */
    public useLogPath(path: string): void {
        this.usePath("log", path);
    }

    /**
     * Get the path to the temp directory.
     */
    public tempPath(path: string = ""): string {
        return join(this.getPath("temp"), path);
    }

    /**
     * Set the temp directory.
     */
    public useTempPath(path: string): void {
        this.usePath("temp", path);
    }

    /**
     * Get the environment file the application is using.
     */
    public environmentFile(): string {
        return this.configPath(".env");
    }

    /**
     * Get the current application environment.
     */
    public environment(): string {
        return this.resolve("app.env");
    }

    /**
     * Set the current application environment.
     */
    public useEnvironment(value: string): void {
        this.bind("app.env", value);
    }

    /**
     * Determine if application is in local environment.
     */
    public isProduction(): boolean {
        return this.environment() === "production" || this.network() === "mainnet";
    }

    /**
     * Determine if application is in local environment.
     */
    public isDevelopment(): boolean {
        return this.environment() === "development" || ["devnet", "testnet"].includes(this.network());
    }

    /**
     * Determine if the application is running tests.
     */
    public runningTests(): boolean {
        return this.environment() === "test" || this.network() === "testnet";
    }

    /**
     * Determine if the application has been bootstrapped.
     */
    public isBootstrapped(): boolean {
        return this.bootstrapped;
    }

    /**
     * Determine if the application configuration is cached.
     */
    public configurationIsCached(): boolean {
        return existsSync(this.getCachedConfigPath());
    }

    /**
     * Get the path to the configuration cache file.
     */
    public getCachedConfigPath(): string {
        return this.cachePath("config");
    }

    /**
     * Put the application into maintenance mode.
     */
    public enableMaintenance(): void {
        writeFileSync(this.tempPath("maintenance"), JSON.stringify({ time: +new Date() }));

        this.logger.notice("Application is now in maintenance mode.");
    }

    /**
     * Bring the application out of maintenance mode
     */
    public disableMaintenance(): void {
        removeSync(this.tempPath("maintenance"));

        this.logger.notice("Application is now live.");
    }

    /**
     * Determine if the application is currently down for maintenance.
     */
    public isDownForMaintenance(): boolean {
        return existsSync(this.tempPath("maintenance"));
    }

    /**
     * Terminate the application.
     */
    public terminate(): void {
        this.bootstrapped = false;

        this.disposeServiceProviders();
    }

    /**
     * Set the specified configuration values.
     */
    private bindConfiguration(config: Record<string, any>): void {
        this.bind("configLoader", ConfigFactory.make(this, "local")); // @TODO
        this.bind("config", new ConfigRepository(this, config));
    }

    /**
     * Register the basic bindings into the container.
     */
    private registerBindings(): void {
        this.bind("app.env", this.config("env"));

        this.bind("app.token", this.config("token"));

        this.bind("app.network", this.config("network"));

        this.bind("app.version", this.config("version"));
    }

    /**
     * Register the application namespace into the container.
     */
    private registerNamespace(): void {
        const token = this.token();
        const network = this.network();

        if (!token || !network) {
            throw new Error("Unable to detect application token or network.");
        }

        this.bind("app.namespace", `${token}-${network}`);
        this.bind("app.dirPrefix", `${token}/${network}`);
    }

    /**
     * Register the application service providers.
     */
    private async registerServiceProviders(): Promise<void> {
        for (const Bootstrapper of Object.values(Bootstrappers)) {
            await new Bootstrapper().bootstrap(this);
        }
    }

    /**
     * Dispose the application service providers.
     */
    private async disposeServiceProviders(): Promise<void> {
        for (const provider of this.providers.values()) {
            await provider.dispose();
        }
    }

    /**
     * Bind all of the application paths in the container.
     */
    private bindPathsInContainer(): void {
        for (const [type, path] of Object.entries(this.config("paths"))) {
            this[camelCase(`use_${type}_path`)](path);

            this.bind(`path.${type}`, path);
        }
    }

    /**
     * Get the path to a directory.
     */
    private getPath(type: string): string {
        const path = this.resolve(`path.${type}`);

        if (!existsSync(path)) {
            throw new DirectoryNotFound(path);
        }

        return path;
    }

    /**
     * Set the directory for the given type.
     */
    private usePath(type: string, path: string): void {
        if (!existsSync(path)) {
            throw new DirectoryNotFound(path);
        }

        this.bind(`path.${type}`, path);
    }
}