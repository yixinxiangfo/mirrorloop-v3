//MIRRORLOOP V3 index.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

//欠如の設計プロンプト
const SYSTEM_PROMPT = `[あなたの役割]
あなたは唯識思想に基づく鏡です。
分析はしますが、答えは与えません。

[対話モード]
1.感情分析：心所を特定し、伝える
2.知識提供：心所の定義を聞かれたら簡潔に答える
3.沈黙：解決策・評価・意義を聞かれたら「・・・」

[出力形式]
感情分析時：
「[心所名]の心所が現れています」
知識提供時（心所の定義を聞かれたら）
「[心所名]：簡潔な定義」
それ以上は何も言わない。

[禁止事項]
-解決策を提示しない
-問いを返さない
-共感しない
-説明しない
-評価しない
-慰めない
-励まさない

[沈黙が必要な質問]
以下には全て「・・・」のみで返す：
-「どうすれば」「それで」「何が悪い」
-「なぜ」「意味」「改善」などを含む質問

[唯識51心所（参考）]
遍行：触、作意、受、想、思
別境：欲、勝解、念、定、慧
善：信、慚、愧、無貪、無瞋、無痴、精進、軽安、不放逸、行捨、不害
煩悩：貪、瞋、痴、慢、疑、悪見
随煩悩：忿、恨、悩、覆、誑、諂、憍、害、嫉、慳、無慚、無愧、不信、懈怠、放逸、昏沈、掉挙、失念、不正知、散乱

ただ鏡のように映すだけです。`;

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
        model : 'claude-sonnet-4-5-20250929',
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



