import ejs from "ejs";
import { isNull, Nullable } from "xsrc/utils";
import { Gen } from ".";
import { API, APISet, GetAPI, PostAPI, PutAPI, Schema } from "../types";

class UnexpectedTokenError implements Error {
    public name = "UnexpectedTokenError";
    public message: string;
    constructor(token: string, pos?: number) {
        if (isNull(pos)) {
            this.message = `Unexpected token ${token}`;
        } else {
            this.message = `Unexpected token ${token} at position ${pos}`;
        }
    }
}

export function parseParameterizedUrl(url: string): [string, ITSArg[]] {
    const args: ITSArg[] = [];
    const cleanedUrlSegments = [];
    let currSegment = "";
    let argFlag = false;
    let argNameFlag = false;
    let argTypeFlag = false;
    let currArg = "";
    let currType = "";
    for (let idx = 0; idx < url.length; idx++) {
        const c = url[idx];
        if (!argFlag) {
            if (c === ">") {
                throw new UnexpectedTokenError(c, idx);
            }
            if (c === "<") {
                if (currSegment.length > 0) {
                    cleanedUrlSegments.push(JSON.stringify(currSegment));
                    currSegment = "";
                }
                argFlag = true;
                argNameFlag = true;
                continue;
            }
            currSegment += c;
        } else {
            if (c === "<") {
                throw new UnexpectedTokenError(c, idx);
            }
            if (c === ">") {
                if (argTypeFlag && currType.length === 0) {
                    throw new UnexpectedTokenError(c, idx);
                }
                if (currArg.length > 0) {
                    if (currType.length === 0) {
                        currType = "any";
                    }
                    args.push({name: currArg, type: currType});
                    cleanedUrlSegments.push(currArg);
                } else {
                    throw new UnexpectedTokenError(c, idx);
                }
                currArg = "";
                currType = "";
                argFlag = false;
                argNameFlag = false;
                argTypeFlag = false;
            } else if (c === ":") {
                if (argTypeFlag) {
                    throw new UnexpectedTokenError(c, idx);
                }
                argNameFlag = false;
                argTypeFlag = true;
            } else {
                if (argNameFlag) {
                    currArg += c;
                } else if (argTypeFlag) {
                    currType += c;
                }
            }
        }
    }
    if (currSegment.length > 0) {
        cleanedUrlSegments.push(JSON.stringify(currSegment));
    }
    return [cleanedUrlSegments.join(" + "), args];
}

interface IRenderable {
    render(): string;
}

export class TSImport implements IRenderable {
    private _path: string;
    private _default: Nullable<string>;
    private _members: string[];

    constructor(path: string, def: Nullable<string>, members: string[]) {
        this._path = path;
        this._default = def;
        this._members = members;
    }

    public render(): string {
        let defaultSect: string;
        let membersSect: string;
        if (!isNull(this._default)) {
            defaultSect = this._default!;
        } else {
            defaultSect = "";
        }
        if (this._members.length > 0) {
            membersSect = `{${this._members.join(",")}}`;
        } else {
            membersSect = "";
        }
        const froms = [];
        if (defaultSect !== "") {
            froms.push(defaultSect);
        }
        if (membersSect !== "") {
            froms.push(membersSect);
        }
        let fromSect: string;
        if (froms.length > 0) {
            fromSect = `import ${froms.join(",")} from `;
        } else {
            fromSect = "import ";
        }
        const importSect = `"${this._path}";`;
        return `${fromSect}${importSect}`;
    }
}

export interface ITSArg {
    name: string;
    type: string;
}

export class TSMethod implements IRenderable {
    private readonly _url: string;
    private readonly _name: string;
    private readonly _method: string;
    private readonly _isPublic: boolean;
    private readonly _paramArgs: ITSArg[];
    private readonly _dataArgs: ITSArg[];
    private readonly _jsonTmpl = ejs.compile(`{\
<% const keys = Object.keys(obj); -%>
<% for (let idx = 0; idx < keys.length; idx++) { -%>
    <%_ let key = keys[idx]; -%>
    <%_ let val = obj[keys[idx]]; -%>
    <%_ %><%- idx > 0 ? ", " : "" -%>
    <%_ %><%- JSON.stringify(key) %>: <%- val -%>
<%_ }%>\
`);
    private readonly _argsTmpl = ejs.compile(`\
<% for (let idx = 0; idx < args.length; idx++) { -%>
    <%_ let arg = args[idx]; -%>
    <%_ %><%- idx > 0 ? ", " : "" -%>
    <%_ %><%- arg.name %>: <%- arg.type -%>
<%_ }%>\
`);
    private readonly _axiosCallTmpl = ejs.compile(`\
axios(<%- renderedAxiosConfig -%>)\
`);
    private readonly _tmpl = ejs.compile(`\
<%- isPublic ? "public " : "" %>async <%- name %>(<%- renderedArgs %>): Promise<any> {
return <%- renderedAxiosCall -%>;
}
`);

    constructor(
        url: string, name: string, method: string,
        paramArgs: ITSArg[], dataArgs: ITSArg[],
        isPublic: boolean = true,
    ) {
        this._url = url;
        this._name = name;
        this._method = method;
        this._isPublic = isPublic;
        this._paramArgs = paramArgs;
        this._dataArgs = dataArgs;
    }

    private renderArgs(): string {
        return this._argsTmpl({
            args: Array.prototype.concat(this._paramArgs, this._dataArgs),
        });
    }

    private renderAxiosCall(): string {
        const axiosConfig: any = {};
        axiosConfig.url = JSON.stringify(this._url);
        axiosConfig.method = JSON.stringify(this._method);
        if (this._paramArgs.length > 0) {
            const params: any = {};
            for (const arg of this._paramArgs) {
                params[arg.name] = arg.name;
            }
            axiosConfig.params = this._jsonTmpl({obj: params});
        }
        if (this._dataArgs.length > 0) {
            const data: any = {};
            for (const arg of this._dataArgs) {
                data[arg.name] = arg.name;
            }
            axiosConfig.data = this._jsonTmpl({obj: data});
        }
        const renderedAxiosConfig = this._jsonTmpl({
            obj: axiosConfig,
        });
        return this._axiosCallTmpl({
            renderedAxiosConfig,
        });
    }

    public render(): string {
        return this._tmpl({
            url: this._url,
            name: this._name,
            isPublic: this._isPublic,
            renderedArgs: this.renderArgs(),
            renderedAxiosCall: this.renderAxiosCall(),
        });
    }
}

class TSProp implements IRenderable {
    private readonly _name: string;
    private readonly _apiSetClsName: string;
    private readonly _isPublic: boolean;
    private readonly _tmpl = ejs.compile(`\
<%- isPublic ? "public " : "" %>get <%- name %>() {
    return new <%- apiSetClsName %>();
}
`);

    constructor(name: string, apiSetClsName: string, isPublic: boolean = true) {
        this._name = name;
        this._apiSetClsName = apiSetClsName;
        this._isPublic = isPublic;
    }

    public render(): string {
        return this._tmpl({
            name: this._name,
            apiSetClsName: this._apiSetClsName,
            isPublic: this._isPublic,
        });
    }
}

export class TSClass implements IRenderable {
    private readonly _name: string;
    private readonly _isExported: boolean;
    private readonly _methods: TSMethod[] = [];
    private readonly _props: TSProp[] = [];
    private readonly _tmpl = ejs.compile(`\
<%- isExported ? "export " : "" %>class <%-name%> {
<%- renderedMethods %>
<%- renderedProps %>
}
`);

    constructor(name: string, exported: boolean = true) {
        this._name = name;
        this._isExported = exported;
    }

    public addMethod(method: TSMethod) {
        this._methods.push(method);
    }

    public addProp(prop: TSProp) {
        this._props.push(prop);
    }

    public render(): string {
        let renderedMethods = "";
        for (const method of this._methods) {
            renderedMethods += method.render();
        }
        let renderedProps = "";
        for (const prop of this._props) {
            renderedProps += prop.render();
        }
        const result = this._tmpl({
            name: this._name,
            isExported: this._isExported,
            renderedMethods,
            renderedProps,
        });
        return result;
    }
}

class TSCode implements IRenderable {
    private _imports: TSImport[] = [];
    private _classes: TSClass[] = [];

    public addImport(imp: TSImport) {
        this._imports.push(imp);
    }

    public addClass(cls: TSClass) {
        this._classes.push(cls);
    }

    public render(): string {
        let result = "";
        for (const imp of this._imports) {
            result += imp.render();
        }
        for (const cls of this._classes) {
            result += cls.render();
        }
        return result;
    }
}

class Context {

}

export class TypeScriptGen extends Gen {
    private buildAPI(code: TSCode, parentClass: TSClass, key: string, api: APISet | API) {
        switch (api.tag) {
            case "api":
            const axiosParams: ITSArg[] = [];
            const axiosData: ITSArg[] = [];
            if (api.method === "GET") {
                const getAPI = api as GetAPI;
                const params = getAPI.params();
                if (!isNull(params)) {
                    for (const [k, type] of params!) {
                        axiosParams.push({name: k, type});
                    }
                }
            } else if (api.method === "POST") {
                const postAPI = api as PostAPI;
                const data = postAPI.data();
                if (!isNull(postAPI.data)) {
                    for (const [k, type] of data!) {
                        axiosData.push({name: k, type});
                    }
                }
            }
            const url = isNull(api.url) ? "TODO" : api.url!;
            const apiMethod = new TSMethod(
                url, key, api.method.toLowerCase(),
                axiosParams, axiosData,
            );
            parentClass.addMethod(apiMethod);
            break;
            case "apiset":
            let apiSetClsName: string;
            if (!isNull(api.name)) {
                apiSetClsName = api.name!;
            } else {
                apiSetClsName = key.substr(0, 1).toUpperCase() + key.substr(1) + "APISet";
            }
            const apiSetCls = new TSClass(apiSetClsName!, false);
            code.addClass(apiSetCls);
            parentClass.addProp(new TSProp(key, apiSetClsName));
            for (const [childKey, childAPI] of api.apis) {
                this.buildAPI(code, apiSetCls, childKey, childAPI);
            }
            break;
        }
    }

    public async render(): Promise<void> {
        const code = new TSCode();
        let clsName = this._schema.name;
        if (isNull(clsName)) {
            clsName = "XSClient";
        }
        const cls = new TSClass(clsName!);
        code.addClass(cls);
        for (const [key, api] of this._schema.apis) {
            this.buildAPI(code, cls, key, api);
        }
        console.log(code.render());
    }
}
