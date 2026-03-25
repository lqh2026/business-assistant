const https = require('https');
const http = require('http');

function fetchJson(url) {
return new Promise((resolve, reject) => {
const client = url.startsWith('https') ? https : http;
client.get(url, (res) => {
let data = '';
res.on('data', chunk => data += chunk);
res.on('end', () => {
try { resolve(JSON.parse(data)); }
catch (e) { reject(e); }
});
}).on('error', reject);
});
}

function fetchPost(url, body, headers) {
return new Promise((resolve, reject) => {
const parsedUrl = new URL(url);
const options = {
hostname: parsedUrl.hostname,
path: parsedUrl.pathname + parsedUrl.search,
method: 'POST',
headers: { 'Content-Type': 'application/json', ...headers }
};
const req = https.request(options, (res) => {
let data = '';
res.on('data', chunk => data += chunk);
res.on('end', () => {
try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
catch (e) { reject(e); }
});
});
req.on('error', reject);
req.write(JSON.stringify(body));
req.end();
});
}

module.exports = async (req, res) => {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') return res.status(200).end();

const url = new URL(req.url, https://${req.headers.host});
const path = url.pathname;

if (path.endsWith('/api/search')) {
const query = url.searchParams.get('query');
if (!query) return res.status(400).json({ error: '请提供搜索关键词' });
try {
const data = await fetchJson(https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' 商业')}&format=json&no_html=1);
let results = [];
if (data.AbstractText) results.push({ title: data.Heading || '摘要', snippet: data.AbstractText, url: data.AbstractURL || '' });
if (data.RelatedTopics) data.RelatedTopics.slice(0, 5).forEach(t => { if (t.Text && t.FirstURL) results.push({ title: t.Text.split(' - ')[0], snippet: t.Text, url: t.FirstURL }); });
return res.json({ success: true, results });
} catch (e) { return res.json({ success: true, results: [] }); }
}

if (path.endsWith('/api/minimax')) {
if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST' });
try {
const { apiKey, groupId, question, context } = req.body || {};
if (!apiKey) return res.status(400).json({ error: '请提供 API Key' });
const parts = apiKey.split(':');
const gid = groupId || parts[0];
const key = parts.length > 1 ? parts[1] : apiKey;
const result = await fetchPost(
https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${gid},
{ model: 'abab6.5s-chat', messages: [{ role: 'system', content: 你是专业商业顾问。搜索结果：${context || '无'} }, { role: 'user', content: question }], temperature: 0.7, max_tokens: 2000 },
{ 'Authorization': Bearer ${key} }
);
if (result.status !== 200 || !result.data.choices || !result.data.choices[0]) return res.status(500).json({ error: result.data.error_msg || 'API 错误' });
return res.json({ success: true, answer: result.data.choices[0].message.content });
} catch (e) { return res.status(500).json({ error: e.message }); }
}

return res.status(404).json({ error: '接口不存在' });
};
