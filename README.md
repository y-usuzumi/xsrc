# XSRC

> **!!! 已放弃！** 请右转[xsrc-rs](https://github.com/y-usuzumi/xsrc-rs)

_Work in Progress_

XSRC = **XiaoSi REST Client**

XSRC是一套RESTful API文档的定义和代码生成工具。

## 文档（Schema）

```yaml
# $url指根URL，如果为null/undefined，则成为生成的Client构造函数的参数
$url: "http://api_root_url"
# 生成的Client类名，默认为XSClient，如：
# let c = new XSClient();
$as: "XiaoSiClient"
# APISet名，如：
# let usersAPI = c.users;
~users:
  # APISet的根URL，${super}等同于${super.url}，此处为：
  # http://www.baidu.com/users
  $url: "${super}/users"
  # API，如：
  # await result = usersAPI.all();
  all:
    # API请求的URL，默认为${super}
    $url: "${super}"
    # API请求的HTTP方法，默认为GET
    $method: "GET"
  # await result = usersAPI.get(3);
  get:
    # 当URL中包含<arg:type>格式的内容时，提取为API参数
    $url: "${super}/<id:number>"
    # URL中?后面的参数，也会提取为API参数
    $params:
      # 竖线后面的部分可省略。目前仅支持默认值
      detail: "boolean|default:true"
  # await result = usersAPI.create("小四", "就不告诉你");
  create:
    $method: "POST"
    # 表单参数
    $data:
      username: "string"
      password: "string"
  update:
    # 当然了，如果不嫌恶心的话，你也可以使用${super.super.super.super.url}引用更上层的变量
    $url: "${super}/<id:number>/"
    $method: "PUT"
    $data:
      password: "string"
  # let userBudgetsAPI = usersAPI.budgets;
  ~budgets:
    # http://www.baidu.com/users/budgets
    $url: "${super}/budgets"
    # await result = userBudgetsAPI.all();
    all: {}
```

## 客户端代码生成

* TypeScript

   ```sh
   xsrc <schema_file> > sample.ts
   ```

  使用方法：

  ```typescript
  import SampleClient from "./sample";

  const client = new SampleClient();
  // 当根url未指定时：
  const client2 = new SampleClient("http://api_root_url");

  // ~users.all
  await client.users.all();
  // ~users.get
  await client.users.get();
  // ~users.create
  await client.users.create("xiaosi", "就不告诉你");
  // ~users.update
  await client.users.update(3, "还不告诉你");
  // ～users.~budgets.all
  await client.users.budgets.all();
  ```

## FAQ

* Q: XiaoSi是什么？

  A: 你管得着么（笑死）。
