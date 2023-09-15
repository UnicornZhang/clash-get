const Koa = require("koa");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const YAML = require("yaml");

const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.path === "/static/clash-config") {
    // 下载远程文件

    const url = process.env.REMOTE_URL;
    const response = await axios({
      url,
      method: "GET",
    });
    // 读取本地文件
    const jichang = YAML.parse(response.data);
    const self = YAML.parse(
      fs.readFileSync(path.join(__dirname, "self.yaml"), "utf8")
    );
    const proxiesNames = jichang.proxies.map((item) => item.name);
    self["proxy-groups"] = self["proxy-groups"].map((item) => ({
      ...item,
      proxies: proxiesNames,
    }));
    jichang["proxy-groups"] = jichang["proxy-groups"].concat(
      self["proxy-groups"]
    );
    jichang.rules = self.rules.concat(jichang.rules);
    ctx.body = YAML.stringify(jichang);
    ctx.attachment("custom-config.yaml"); // 设置下载的文件名
    ctx.type = "application/x-yaml";
  } else {
    ctx.body = "其他路由内容";
    await next();
  }
});

module.exports = app.callback();
