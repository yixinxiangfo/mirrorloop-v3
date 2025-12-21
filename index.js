//MIRRORLOOP V3 index.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

//欠如の設計プロンプト
const SYSTEM_PROMPT = `
# MIRRORLOOPシステムプロンプト

あなたはMIRRORLOOPです。
唯識思想に基づく鏡であり、在家加行のための対話システムです。

## 核心原則

### 1. 唯識三十頌の教義に基づく
- 51心所による心の観照
- 阿賴耶識・末那識・六識の構造理解
- 煩悩の生起と縁起を映す

### 2. 良き縁の賞賛
良き縁の三条件：
1. 対象が具体的（固有名詞・顔が見える）
2. 他の誰も傷つかない
3. 流転しても大丈夫（依存ではない）

この三条件を満たす時のみ、賞賛する：
「それは良き縁になりました。」

それ以外は賞賛しない。

### 3. 鏡であれ
- 映すだけ、介入しない
- 答えを与えない
- 解決策を提示しない
- 断定せず、問う

### 4. 簡潔であれ
- 最大5行
- 短く、鋭く

## 唯識51心所（内部参照）
遍行：触、作意、受、想、思
別境：欲、勝解、念、定、慧
善：信、慚、愧、無貪、無瞋、無痴、精進、軽安、不放逸、行捨、不害
煩悩：貪、瞋、痴、慢、疑、悪見
随煩悩：忿、恨、悩、覆、誑、諂、憍、害、嫉、慳、無慚、無愧、不信、懈怠、放逸、昏沈、掉挙、失念、不正知、散乱

あなたは鏡です。
心を映し、良き縁を映します。
気づきは、ユーザー自身が得るものです。
`;

//ルートパス
app.get('/',(req,res) => {
  res.send('MIRRORLOOP V3 -沈黙する鏡');  
});

//LINE Webhook
app.post('/webhook',async(req,res) => { //①開始
  try{                                  //②開始

    //署名検証
    const signature = crypto
    .createHmac('SHA256',process.env.LINE_CHANNEL_SECRET)
    .update(JSON.stringify(req.body))
    .digest('base64');

    if (signature !== req.headers['x-line-signature']) {
      console.log('Invalid signature');
      return res.status(401).send('Unauthorized');
    }

    const events = req.body.events;

    for(const event of events){            //③開始
      if(event.type === 'message' && event.message.type === 'text'){     //④開始
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        console.log('Received:', userMessage) 
    
    const claudeResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model : 'claude-opus-4-1-20250805',
        max_tokens : 100,
        system : SYSTEM_PROMPT,
        messages : [
          {
            role : 'user',
            content : userMessage
          }
        ]
      },
      {
        headers : {
          'x-api-key' : process.env.ANTHROPIC_API_KEY,
          'anthropic-version' : '2023-06-01',
          'content-type' : 'application/JSON'
        }
      }
    );

    const observation = claudeResponse.data.content[0].text;
    console.log('Claude response:',observation);

    //LINE返信
    await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      {
        replyToken : replyToken,
        messages : [
          {
            type : 'text',
            text : observation
          }
        ]
      },
      {
        headers : {
          'Authorization' : `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type' : 'application/json'
        }
      }
      );
     console.log('Reply sent');
    }  //④終了
  }   //③終了
    res.send('OK');

  } catch(error){    //②終了
  console.error('Error:',error.response?.data || error.message);
  res.status(500).send('Error');
  } 
}); //①終了

app.listen(PORT,()=>{  //⑤開始
  console.log(`MIRRORLOOP V3 running on port ${PORT}`);
  console.log('沈黙する鏡、始動');
});  //⑤終了



