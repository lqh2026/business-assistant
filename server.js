const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 网络搜索接口
app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: '请提供搜索关键词' });
    }

    try {
        // 使用 DuckDuckGo 搜索
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' 商业')}&format=json&no_html=1`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        let searchResults = [];
        
        if (data.AbstractText) {
            searchResults.push({
                title: data.Heading || '摘要',
                snippet: data.AbstractText,
                url: data.AbstractURL || ''
            });
        }
        
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 5).forEach(topic => {
                if (topic.Text && topic.FirstURL) {
                    searchResults.push({
                        title: topic.Text.split(' - ')[0] || '相关主题',
                        snippet: topic.Text,
                        url: topic.FirstURL
                    });
                }
            });
        }
        
        res.json({ success: true, results: searchResults });
    } catch (error) {
        console.error('搜索错误:', error);
        res.json({ success: true, results: [], message: '搜索服务暂时不可用，将使用 AI 知识回答' });
    }
});

// MiniMax API 代理
app.post('/api/minimax', async (req, res) => {
    const { apiKey, groupId, question, context } = req.body;
    
    if (!apiKey) {
        return res.status(400).json({ error: '请提供 API Key' });
    }
    
    const apiKeyParts = apiKey.split(':');
    const groupIdFinal = groupId || apiKeyParts[0];
    const secretKey = apiKeyParts.length > 1 ? apiKeyParts[1] : apiKey;

    const systemPrompt = `你是一个专业的商业知识顾问。请基于以下搜索结果，用清晰、专业、易懂的方式回答用户的问题。

搜索结果：
${context || '（暂无搜索结果，请基于你的知识回答）'}

要求：
1. 回答要专业、准确、有深度
2. 如果有多个要点，请用列表形式呈现
3. 在回答末尾标注信息来源
4. 如果搜索结果不相关或不充分，请基于专业知识补充`;

    try {
        const response = await fetch(`https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${groupIdFinal}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'abab6.5s-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: errorData.message || `API 错误: ${response.status}` });
        }

        const data = await response.json();
        
        // 打印完整返回数据用于调试
        console.log('MiniMax API 返回:', JSON.stringify(data, null, 2));
        
        // 检查 API 返回的数据结构
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ error: data.error_msg || data.error_message || 'API 返回数据格式异常' });
        }
        
        res.json({ success: true, answer: data.choices[0].message.content });
    } catch (error) {
        console.error('MiniMax API 错误:', error);
        res.status(500).json({ error: error.message || 'API 调用失败' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     💼 商业知识问答助手 - 服务已启动          ║
╠══════════════════════════════════════════════╣
║  电脑访问: http://localhost:${PORT}             ║
║  手机访问: http://192.168.4.20:${PORT}          ║
║  按 Ctrl+C 停止服务                           ║
╚══════════════════════════════════════════════╝
    `);
});
