//MIRRORLOOP V3 index.js
//PostgreSQL接続
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:{
    rejectUnauthorized: false
  }
});

//暗号化関数（encrypt）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc'

function encrypt(text){
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY,'hex'),
    iv
    );
  let encrypted = cipher.update(text,'utf8','hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// 復号化関数（decrypt）
function decrypt(encryptedText){
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0],'hex');
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY,'hex'),
    iv
    );
  let decrypted = decipher.update(encryptedData,'hex','utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

//固有名詞検出
function containsProperNoun(text){
  //カタカナ人名パターン（例:タナカ、ヤマダ）
  const katakanaPattern = /[ア-ン]{2,}(さん|くん|氏|部長|課長|社長)?/;
  //感じ人名パターン（例:田中、山田）
  const kanjiPattern = /(さん|くん|氏|部長|課長|社長|先輩|後輩)/;
  return katakanaPattern.test(text)||kanjiPattern.test(text);
}

//仏教警告文
function getBuddhistWarning(){
  return `固有名詞が含まれています。
仏教では全行為として「不害」を説きます。
他者を傷つける言葉は、
自らの阿頼耶識に刻まれます。
言葉を変えて入力してください。`;
}

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
良き縁の三条件:
1. 対象が具体的(固有名詞・顔が見える)
2. 他の誰も傷つかない
3. 流転しても大丈夫(依存ではない)

この三条件を満たす時のみ、賞賛する:
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

## 唯識51心所(内部参照)
遍行:触、作意、受、想、思
別境:欲、勝解、念、定、慧
善:信、慚、愧、無貪、無瞋、無痴、精進、軽安、不放逸、行捨、不害
煩悩:貪、瞋、痴、慢、疑、悪見
随煩悩:忿、恨、悩、覆、誑、諂、憍、害、嫉、慳、無慚、無愧、不信、懈怠、放逸、昏沈、掉挙、失念、不正知、散乱

あなたは鏡です。
心を映し、良き縁を映します。
気づきは、ユーザー自身が得るものです。
`;

//ルートパス
app.get('/',(req,res) => {
  res.send('MIRRORLOOP V3 -沈黙する鏡');  
});

//LINE Webhook
app.post('/webhook',async(req,res) => {
  try{
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

    for(const event of events){
      
      // 友だち追加イベント処理
      if (event.type === 'follow') {
        const userId = event.source.userId;
        const welcomeMessage = {
          type: 'text',
          text: `🪞 MirrorLoopへようこそ

これは、あなたの心をうつす鏡です。

【2つのモード】

🔍 観照モード
「観照」と送信してください
問いかければ、問い返されます
(1日3回まで)

💬 愚痴モード
そのまま愚痴を送ってください
暗号化して7日間預かります
週次レポートで振り返ります

---
固有名詞(人名・会社名)を含む愚痴は
預かることができません。`
        };
        
        try {
          await axios.post('https://api.line.me/v2/bot/message/push', {
            to: userId,
            messages: [welcomeMessage]
          }, {
            headers: { 'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
          });
        } catch (error) {
          console.error('Welcome message failed:', error);
        }
        continue;
      }
      
      // メッセージイベント以外は無視
      if (event.type !== 'message' || !event.message || event.message.type !== 'text') {
        continue;
      }
      
      // メッセージ情報取得
      const userMessage = event.message.text;
      const replyToken = event.replyToken;
      const userId = event.source.userId;
      console.log('Received:', userMessage);
      
      // モード判定
      if (userMessage.startsWith('観照')) {
        // 観照モード
        const claudeResponse = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-opus-4-1-20250805',
            max_tokens: 100,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: userMessage
              }
            ]
          },
          {
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            }
          }
        );

        const observation = claudeResponse.data.content[0].text;
        console.log('Claude response:', observation);

        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [
              {
                type: 'text',
                text: observation
              }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Reply sent');
        
      } else {
        // 愚痴モード
        
        // 固有名詞チェック
        if (containsProperNoun(userMessage)) {
          const warning = getBuddhistWarning();
          
          try {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
              replyToken: replyToken,
              messages: [{ type: 'text', text: warning }]
            }, {
              headers: { 'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
            });
          } catch (error) {
            console.error('Warning message failed:', error);
          }
          continue;
        }
        
        // 固有名詞なし → 暗号化して保存
        try {
          const encrypted = encrypt(userMessage);
          
          await pool.query(
            'INSERT INTO complaints (user_id, encrypted_text) VALUES ($1, $2)',
            [userId, encrypted]
          );
          
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: replyToken,
            messages: [{ 
              type: 'text', 
              text: '愚痴を預かりました。\n\n暗号化して7日間保管します。\n週次レポートで振り返ります。' 
            }]
          }, {
            headers: { 'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
          });
          
        } catch (error) {
          console.error('Complaint save failed:', error);
        }
      }
    }
    
    res.send('OK');

  } catch(error){
    console.error('Error:', error.response?.data || error.message);
    res.status(500).send('Error');
  } 
});

app.listen(PORT,()=>{
  console.log(`MIRRORLOOP V3 running on port ${PORT}`);
  console.log('沈黙する鏡、始動');
});

//PostgreSQLにデータベースを作る
async function createTableIfNotExists(){
  try{
    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaints(
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        encrypted_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ complaints table ready');
  } catch(error){
    console.error('❌ Table creation error:', error);
  }
}

createTableIfNotExists();