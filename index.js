const Koa = require("koa");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const YAML = require("yaml");

const app = new Koa();
const savePath = path.join(__dirname, "custom-config.yaml");

// 下载远程文件的中间件
const downloadFileMiddleware = async (ctx, next) => {
  const url = process.env.REMOTE_URL;

  if (!url) return;

  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    const fileStream = fs.createWriteStream(savePath);
    response.data.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    console.log("文件下载完成");
    ctx.body = "文件下载完成";
  } catch (error) {
    fs.unlink(savePath, () => {}); // 删除文件
    console.error(`下载文件时发生错误: ${error.message}`);
    ctx.body = `下载文件时发生错误: ${error.message}`;
  }
};

app.use(async (ctx, next) => {
  if (ctx.path === "/static/clash-config") {
    // 下载远程文件
    await downloadFileMiddleware(ctx, next);
    // 读取本地文件
    const jichang = YAML.parse(fs.readFileSync(savePath, "utf8"));
    const self = YAML.parse(fs.readFileSync("./self.yaml", "utf8"));
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
    ctx.attachment(savePath); // 设置下载的文件名
    ctx.type = "application/x-yaml";
    rimraf.sync(savePath); // 删除文件
  } else {
    ctx.body = "其他路由内容";
    await next();
  }
});

app.listen(3030, () => {
  console.log("服务启动");
});
