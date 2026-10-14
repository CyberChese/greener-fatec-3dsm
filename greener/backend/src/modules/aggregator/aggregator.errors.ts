export class AggregatorClientError extends Error {
    constructor(message: string, public readonly url?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class AggregatorConfigError extends AggregatorClientError { }
export class AggregatorContractError extends AggregatorClientError { }
export class AggregatorTimeoutError extends AggregatorClientError { }
export class AggregatorUnavailableError extends AggregatorClientError { }

export class AggregatorHttpError extends AggregatorClientError {
    constructor(message: string, url: string, public readonly statusCode: number) {
        super(message, url);
    }
}