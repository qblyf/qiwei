require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();

// 中间件配置
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: true
}));

// 企业微信配置
const wxConfig = {
  corpId: process.env.WX_CORP_ID,
  agentId: process.env.WX_AGENT_ID,
  secret: process.env.WX_SECRET,
  redirectUri: process.env.WX_REDIRECT_URI
};

// 路由
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/login', (req, res) => {
  const state = uuidv4();
  req.session.wxState = state;
  
  const authUrl = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${wxConfig.corpId}&agentid=${wxConfig.agentId}&redirect_uri=${encodeURIComponent(wxConfig.redirectUri)}&state=${state}`;
  res.redirect(authUrl);
});

app.get('/wxcallback', async (req, res) => {
  try {
    // 验证state参数
    if (!req.query.state || req.query.state !== req.session.wxState) {
      return res.status(401).send('Invalid state parameter');
    }

    // 获取access_token
    const tokenResponse = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/gettoken', {
      params: {
        corpid: wxConfig.corpId,
        corpsecret: wxConfig.secret
      }
    });

    if (tokenResponse.data.errcode !== 0) {
      return res.status(500).send('Failed to get access token');
    }

    const accessToken = tokenResponse.data.access_token;

    // 获取用户信息
    const userResponse = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo', {
      params: {
        access_token: accessToken,
        code: req.query.code
      }
    });

    if (userResponse.data.errcode !== 0) {
      return res.status(500).send('Failed to get user info');
    }

    // 存储用户信息到session
    req.session.user = {
      userId: userResponse.data.UserId,
      corpId: wxConfig.corpId
    };

    res.redirect('/');
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// 处理企业微信OAuth2.0回调
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('缺少授权码');
  }
  
  try {
    // 使用code获取access_token
    // 这里需要实现与企业微信API的交互
    // ...

    // 成功后重定向到您的应用页面
    res.redirect('/success');
  } catch (error) {
    console.error('OAuth回调处理错误:', error);
    res.status(500).send('授权过程出错');
  }
});

// 如果您的 app.js 文件中没有正确监听端口，请修改为类似这样：
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});