import {applyMixins, Nullable} from "xsrc/utils";

export interface IContext {
    super: Nullable<IContext>;
    [key: string]: any;
}

class QueryParams {
    public readonly _params?: Map<string, string>;

    public params(): Nullable<Map<string, any>> {
        return this._params;
    }
}

class PostData {
    public readonly _data?: Map<string, any>;

    public data(): Nullable<Map<string, any>> {
        return this._data;
    }
}

export abstract class API {
    public readonly tag = "api";
    protected readonly _method: string;
    protected _url: Nullable<string>;
    protected _context: IContext;

    constructor(url: Nullable<string>, context: IContext) {
        this._url = url;
        this._context = context;
    }

    public get url(): Nullable<string> {
        return this._url;
    }

    public get context(): IContext {
        return this._context;
    }

    public get method(): string {
        return this._method;
    }
}

export class GetAPI extends API implements QueryParams {
    protected readonly _method = "GET";
    public readonly _params?: Map<string, any>;

    constructor(url: Nullable<string>, context: IContext, params?: Map<string, any>) {
        super(url, context);
        this._params = params;
    }

    public params: () => Nullable<Map<string, any>>;
}

applyMixins(GetAPI, [QueryParams]);

export class PostAPI extends API {
    protected readonly _method = "POST";
    public readonly _data?: Map<string, any>;

    constructor(url: Nullable<string>, context: IContext, data?: Map<string, string>) {
        super(url, context);
        this._data = data;
    }

    public data: () => Nullable<Map<string, any>>;
}

applyMixins(PostAPI, [PostData]);

export class PutAPI extends API {
    protected readonly _method = "PUT";
    public readonly _data?: Map<string, any>;

    constructor(url: Nullable<string>, context: IContext, data?: Map<string, string>) {
        super(url, context);
        this._data = data;
    }

    public data: () => Nullable<Map<string, any>>;
}

applyMixins(PutAPI, [PostData]);

export class APISet {
    public readonly tag = "apiset";
    protected readonly _name: Nullable<string>;
    protected readonly _url: Nullable<string>;
    protected readonly _context: IContext;
    protected readonly _apis: Map<string, API|APISet> = new Map();

    constructor(name: Nullable<string>, url: Nullable<string>, context: IContext) {
        this._name = name;
        this._url = url;
        this._context = context;
    }

    public get name(): Nullable<string> {
        return this._name;
    }

    public get url(): Nullable<string> {
        return this._url;
    }

    public get context(): IContext {
        return this._context;
    }

    public get apis(): Map<string, API|APISet> {
        return this._apis;
    }

    public addAPI(k: string, api: API|APISet) {
        this._apis.set(k, api);
    }
}

export class Schema {
    protected readonly _name: Nullable<string>;
    protected readonly _url: Nullable<string>;
    protected readonly _context: IContext;
    protected readonly _apis: Map<string, API|APISet> = new Map();

    constructor(name: Nullable<string>, url: Nullable<string>, context: IContext) {
        this._name = name;
        this._url = url;
        this._context = context;
    }

    public get name(): Nullable<string> {
        return this._name;
    }

    public get url(): Nullable<string> {
        return this._url;
    }

    public get apis(): Map<string, API|APISet> {
        return this._apis;
    }

    public addAPI(k: string, api: API|APISet) {
        this._apis.set(k, api);
    }
}
